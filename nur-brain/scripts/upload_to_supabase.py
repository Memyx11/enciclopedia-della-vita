#!/usr/bin/env python3
"""
NUR Knowledge Base - Upload to Supabase pgvector
Processa PDF/TXT e li carica su Supabase per uso in produzione
"""

import os
import sys
import hashlib
from pathlib import Path
from typing import List, Dict, Any

# Controlla dipendenze
try:
    from supabase import create_client, Client
    from sentence_transformers import SentenceTransformer
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    from pypdf import PdfReader
    from dotenv import load_dotenv
except ImportError as e:
    print(f"Errore: {e}")
    print("Installa le dipendenze:")
    print("pip3 install supabase sentence-transformers langchain pypdf python-dotenv")
    sys.exit(1)

# Configurazione
BASE_DIR = Path(__file__).parent.parent.parent  # Enciclopedia-della-Vita
KNOWLEDGE_DIR = BASE_DIR / "nur-brain" / "knowledge-base"

# Carica variabili d'ambiente (prova .env.local poi .env)
env_local = BASE_DIR / ".env.local"
env_file = BASE_DIR / ".env"

if env_local.exists():
    load_dotenv(env_local)
elif env_file.exists():
    load_dotenv(env_file)

# Supabase
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # Serve service role per insert

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Errore: Variabili SUPABASE mancanti")
    print()
    print("Aggiungi SUPABASE_SERVICE_ROLE_KEY al file .env.local:")
    print("  1. Vai su Supabase Dashboard → Project Settings → API")
    print("  2. Copia 'service_role' key (NON anon!)")
    print("  3. Aggiungi al .env.local:")
    print("     SUPABASE_SERVICE_ROLE_KEY=eyJ...")
    sys.exit(1)

# Livelli e priorità
LEVELS = {
    "L0-Fondamento": {"priority": 100, "description": "Bussola invisibile - Corano, principi"},
    "L1-Saggezza": {"priority": 90, "description": "Saggezza universale - Stoici, filosofia"},
    "L2-Salute": {"priority": 80, "description": "Salute e corpo"},
    "L3-Mente": {"priority": 75, "description": "Mente e crescita personale"},
    "L4-Soldi": {"priority": 70, "description": "Finanza e indipendenza"},
    "L5-Relazioni": {"priority": 65, "description": "Relazioni umane"},
    "L6-Legge": {"priority": 60, "description": "Legge e sistema italiano"},
    "L7-Mondo": {"priority": 50, "description": "Storia, geopolitica, futuro"},
}


class NurKnowledgeUploader:
    def __init__(self):
        print("Inizializzazione...")

        # Supabase client
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

        # Embedding model (multilingue - italiano, arabo, inglese)
        print("Caricamento modello embedding (prima volta ~100MB)...")
        self.embedder = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

        # Text splitter
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=100,
            separators=["\n\n", "\n", ". ", " ", ""]
        )

        print("✅ Pronto!")

    def get_file_hash(self, file_path: Path) -> str:
        """Calcola hash MD5 del file"""
        return hashlib.md5(file_path.read_bytes()).hexdigest()

    def is_file_processed(self, file_name: str, file_hash: str) -> bool:
        """Controlla se il file è già stato processato"""
        result = self.supabase.table("processed_files").select("file_hash").eq("file_name", file_name).execute()
        if result.data:
            return result.data[0]["file_hash"] == file_hash
        return False

    def extract_text_from_pdf(self, pdf_path: Path) -> str:
        """Estrae testo da un PDF"""
        try:
            reader = PdfReader(str(pdf_path))
            text = ""
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            return text.strip()
        except Exception as e:
            print(f"  ⚠️ Errore lettura PDF {pdf_path.name}: {e}")
            return ""

    def extract_text(self, file_path: Path) -> str:
        """Estrae testo da qualsiasi file supportato"""
        suffix = file_path.suffix.lower()

        if suffix == '.pdf':
            return self.extract_text_from_pdf(file_path)
        elif suffix in ['.txt', '.md']:
            return file_path.read_text(encoding='utf-8', errors='ignore')
        else:
            print(f"  ⚠️ Formato non supportato: {suffix}")
            return ""

    def process_file(self, file_path: Path, level: str) -> int:
        """Processa un singolo file e lo carica su Supabase"""
        file_name = file_path.name
        file_hash = self.get_file_hash(file_path)

        # Skip se già processato
        if self.is_file_processed(file_name, file_hash):
            print(f"  ⏭️  {file_name} (già processato)")
            return 0

        # Estrai testo
        text = self.extract_text(file_path)
        if not text:
            print(f"  ⚠️ Nessun testo in: {file_name}")
            return 0

        # Chunking
        chunks = self.splitter.split_text(text)
        if not chunks:
            return 0

        print(f"  📄 {file_name}: {len(chunks)} chunks...")

        # Genera embeddings
        embeddings = self.embedder.encode(chunks).tolist()

        # Prepara dati per Supabase
        level_info = LEVELS.get(level, {"priority": 50})

        records = []
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            records.append({
                "content": chunk,
                "embedding": embedding,
                "source_file": file_name,
                "level": level,
                "priority": level_info["priority"],
                "chunk_index": i,
                "total_chunks": len(chunks)
            })

        # Upload in batch (max 1000 per volta)
        batch_size = 500
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            try:
                self.supabase.table("knowledge_chunks").insert(batch).execute()
            except Exception as e:
                print(f"  ❌ Errore upload batch: {e}")
                return 0

        # Marca come processato
        self.supabase.table("processed_files").upsert({
            "file_name": file_name,
            "file_hash": file_hash,
            "chunks_count": len(chunks),
            "level": level
        }).execute()

        print(f"  ✅ {file_name}: {len(chunks)} chunks caricati")
        return len(chunks)

    def process_all(self):
        """Processa tutti i file nella knowledge base"""
        total_chunks = 0
        processed_files = 0

        for level_dir in sorted(KNOWLEDGE_DIR.iterdir()):
            if not level_dir.is_dir():
                continue

            level = level_dir.name
            if level not in LEVELS:
                continue

            files = list(level_dir.glob('*.*'))
            valid_files = [f for f in files if f.suffix.lower() in ['.pdf', '.txt', '.md']]

            if not valid_files:
                print(f"\n📁 {level}: vuoto")
                continue

            print(f"\n📁 {level}: {len(valid_files)} file")

            for file_path in valid_files:
                chunks = self.process_file(file_path, level)
                if chunks > 0:
                    total_chunks += chunks
                    processed_files += 1

        print(f"\n{'='*50}")
        print(f"✅ COMPLETATO!")
        print(f"   File processati: {processed_files}")
        print(f"   Chunks totali caricati: {total_chunks}")

    def stats(self):
        """Mostra statistiche"""
        print("\n📊 STATISTICHE KNOWLEDGE BASE NUR")
        print("="*50)

        # Conta chunks per livello
        result = self.supabase.table("knowledge_chunks").select("level", count="exact").execute()
        total = result.count or 0
        print(f"Chunks totali: {total}")

        # Per livello
        for level in LEVELS.keys():
            result = self.supabase.table("knowledge_chunks").select("id", count="exact").eq("level", level).execute()
            count = result.count or 0
            if count > 0:
                print(f"  {level}: {count} chunks")

        # File processati
        result = self.supabase.table("processed_files").select("*").execute()
        print(f"\nFile processati: {len(result.data)}")
        for f in result.data:
            print(f"  - {f['file_name']} ({f['chunks_count']} chunks)")

    def search(self, query: str, n_results: int = 5, level_filter: str = None):
        """Cerca nella knowledge base"""
        # Genera embedding della query
        query_embedding = self.embedder.encode([query])[0].tolist()

        # Chiama funzione Supabase
        result = self.supabase.rpc("search_knowledge", {
            "query_embedding": query_embedding,
            "match_threshold": 0.5,
            "match_count": n_results,
            "filter_level": level_filter
        }).execute()

        print(f"\n🔍 Risultati per: '{query}'\n")
        for i, item in enumerate(result.data):
            print(f"{i+1}. [{item['level']}] {item['source_file']}")
            print(f"   Similarità: {item['similarity']:.2%}")
            print(f"   {item['content'][:200]}...\n")

    def reset(self):
        """Cancella tutto (PERICOLOSO)"""
        confirm = input("⚠️ Cancellare TUTTA la knowledge base? (scrivi 'CANCELLA'): ")
        if confirm == "CANCELLA":
            self.supabase.table("knowledge_chunks").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
            self.supabase.table("processed_files").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
            print("✅ Knowledge base cancellata")
        else:
            print("Annullato")


def main():
    import argparse
    parser = argparse.ArgumentParser(description='NUR Knowledge Base - Supabase Uploader')
    parser.add_argument('command', choices=['process', 'search', 'stats', 'reset'],
                       help='Comando da eseguire')
    parser.add_argument('--query', '-q', type=str, help='Query per la ricerca')
    parser.add_argument('--level', '-l', type=str, help='Filtra per livello')
    parser.add_argument('--results', '-n', type=int, default=5, help='Numero risultati')

    args = parser.parse_args()

    uploader = NurKnowledgeUploader()

    if args.command == 'process':
        uploader.process_all()

    elif args.command == 'search':
        if not args.query:
            print("Errore: --query richiesto")
            sys.exit(1)
        uploader.search(args.query, args.results, args.level)

    elif args.command == 'stats':
        uploader.stats()

    elif args.command == 'reset':
        uploader.reset()


if __name__ == '__main__':
    main()
