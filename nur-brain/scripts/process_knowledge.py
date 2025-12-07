#!/usr/bin/env python3
"""
NUR Knowledge Base Processor
Processa PDF e li carica in ChromaDB locale
"""

import os
import sys
from pathlib import Path

# Controlla dipendenze
try:
    import chromadb
    from chromadb.config import Settings
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    from pypdf import PdfReader
    from sentence_transformers import SentenceTransformer
except ImportError as e:
    print(f"Errore: {e}")
    print("Installa le dipendenze: pip3 install chromadb langchain pypdf sentence-transformers")
    sys.exit(1)

# Paths
BASE_DIR = Path.home() / "Desktop" / "Enciclopedia-della-Vita"
KNOWLEDGE_DIR = BASE_DIR / "nur-brain" / "knowledge-base"
PROCESSED_DIR = BASE_DIR / "nur-brain" / "processed"
CHROMA_DIR = BASE_DIR / "nur-brain" / "chromadb"

# Levels e priorità
LEVELS = {
    "L0-Fondamento": {"priority": 100, "description": "Bussola invisibile"},
    "L1-Saggezza": {"priority": 90, "description": "Saggezza universale"},
    "L2-Salute": {"priority": 80, "description": "Salute e corpo"},
    "L3-Mente": {"priority": 75, "description": "Mente e crescita"},
    "L4-Soldi": {"priority": 70, "description": "Finanza e indipendenza"},
    "L5-Relazioni": {"priority": 65, "description": "Relazioni umane"},
    "L6-Legge": {"priority": 60, "description": "Legge e sistema"},
    "L7-Mondo": {"priority": 50, "description": "Capire il mondo"},
}

class NurKnowledgeProcessor:
    def __init__(self):
        # Crea directory se non esistono
        CHROMA_DIR.mkdir(parents=True, exist_ok=True)
        PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
        
        # Inizializza ChromaDB
        self.client = chromadb.PersistentClient(path=str(CHROMA_DIR))
        self.collection = self.client.get_or_create_collection(
            name="nur_knowledge",
            metadata={"description": "NUR Knowledge Base"}
        )
        
        # Inizializza embedding model (multilingue)
        print("Caricamento modello embedding (prima volta può richiedere tempo)...")
        self.embedder = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
        
        # Text splitter
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=100,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        
        print(f"ChromaDB inizializzato in: {CHROMA_DIR}")
        print(f"Documenti attuali: {self.collection.count()}")
    
    def extract_text_from_pdf(self, pdf_path: Path) -> str:
        """Estrae testo da un PDF"""
        try:
            reader = PdfReader(str(pdf_path))
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text.strip()
        except Exception as e:
            print(f"Errore lettura {pdf_path.name}: {e}")
            return ""
    
    def process_document(self, file_path: Path, level: str) -> int:
        """Processa un singolo documento e lo aggiunge a ChromaDB"""
        
        # Estrai testo
        if file_path.suffix.lower() == '.pdf':
            text = self.extract_text_from_pdf(file_path)
        elif file_path.suffix.lower() in ['.txt', '.md']:
            text = file_path.read_text(encoding='utf-8', errors='ignore')
        else:
            print(f"Formato non supportato: {file_path.suffix}")
            return 0
        
        if not text:
            print(f"Nessun testo estratto da: {file_path.name}")
            return 0
        
        # Chunking
        chunks = self.splitter.split_text(text)
        
        if not chunks:
            return 0
        
        # Prepara dati per ChromaDB
        level_info = LEVELS.get(level, {"priority": 50, "description": "Unknown"})
        
        ids = []
        documents = []
        metadatas = []
        
        for i, chunk in enumerate(chunks):
            doc_id = f"{file_path.stem}_{i}"
            ids.append(doc_id)
            documents.append(chunk)
            metadatas.append({
                "source": file_path.name,
                "level": level,
                "priority": level_info["priority"],
                "chunk_index": i,
                "total_chunks": len(chunks)
            })
        
        # Genera embeddings
        embeddings = self.embedder.encode(documents).tolist()
        
        # Aggiungi a ChromaDB
        self.collection.add(
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas
        )
        
        # Marca come processato
        processed_marker = PROCESSED_DIR / f"{file_path.stem}.processed"
        processed_marker.touch()
        
        print(f"✅ {file_path.name}: {len(chunks)} chunks aggiunti")
        return len(chunks)
    
    def process_all(self):
        """Processa tutti i documenti non ancora processati"""
        total_chunks = 0
        processed_files = 0
        
        for level_dir in KNOWLEDGE_DIR.iterdir():
            if not level_dir.is_dir():
                continue
            
            level = level_dir.name
            if level not in LEVELS:
                continue
            
            print(f"\n📁 {level}: {LEVELS[level]['description']}")
            
            for file_path in level_dir.iterdir():
                if not file_path.is_file():
                    continue
                
                # Skip se già processato
                processed_marker = PROCESSED_DIR / f"{file_path.stem}.processed"
                if processed_marker.exists():
                    print(f"  ⏭️  {file_path.name} (già processato)")
                    continue
                
                chunks = self.process_document(file_path, level)
                if chunks > 0:
                    total_chunks += chunks
                    processed_files += 1
        
        print(f"\n{'='*50}")
        print(f"✅ Completato!")
        print(f"   File processati: {processed_files}")
        print(f"   Chunks totali: {total_chunks}")
        print(f"   Documenti in DB: {self.collection.count()}")
    
    def search(self, query: str, n_results: int = 5, level_filter: str = None) -> list:
        """Cerca nella knowledge base"""
        query_embedding = self.embedder.encode([query]).tolist()
        
        where_filter = None
        if level_filter:
            where_filter = {"level": level_filter}
        
        results = self.collection.query(
            query_embeddings=query_embedding,
            n_results=n_results,
            where=where_filter
        )
        
        return results
    
    def stats(self):
        """Mostra statistiche della knowledge base"""
        print(f"\n📊 STATISTICHE NUR KNOWLEDGE BASE")
        print(f"{'='*50}")
        print(f"Documenti totali: {self.collection.count()}")
        print(f"Location: {CHROMA_DIR}")
        print(f"\nCartelle knowledge-base:")
        
        for level_dir in sorted(KNOWLEDGE_DIR.iterdir()):
            if not level_dir.is_dir() or level_dir.name not in LEVELS:
                continue
            
            files = list(level_dir.glob('*.*'))
            pdf_count = len(list(level_dir.glob('*.pdf')))
            txt_count = len(list(level_dir.glob('*.txt')))
            
            print(f"  {level_dir.name}: {len(files)} file ({pdf_count} PDF, {txt_count} TXT)")


def main():
    import argparse
    parser = argparse.ArgumentParser(description='NUR Knowledge Base Processor')
    parser.add_argument('command', choices=['process', 'search', 'stats', 'reset'],
                       help='Comando da eseguire')
    parser.add_argument('--query', '-q', type=str, help='Query per la ricerca')
    parser.add_argument('--level', '-l', type=str, help='Filtra per livello')
    parser.add_argument('--results', '-n', type=int, default=5, help='Numero risultati')
    
    args = parser.parse_args()
    
    processor = NurKnowledgeProcessor()
    
    if args.command == 'process':
        processor.process_all()
    
    elif args.command == 'search':
        if not args.query:
            print("Errore: --query richiesto per la ricerca")
            sys.exit(1)
        
        results = processor.search(args.query, args.results, args.level)
        
        print(f"\n🔍 Risultati per: '{args.query}'\n")
        for i, (doc, metadata) in enumerate(zip(results['documents'][0], results['metadatas'][0])):
            print(f"{i+1}. [{metadata['level']}] {metadata['source']}")
            print(f"   {doc[:200]}...\n")
    
    elif args.command == 'stats':
        processor.stats()
    
    elif args.command == 'reset':
        confirm = input("Sei sicuro? Questo cancellerà tutto. (yes/no): ")
        if confirm.lower() == 'yes':
            import shutil
            if CHROMA_DIR.exists():
                shutil.rmtree(CHROMA_DIR)
            for f in PROCESSED_DIR.glob('*.processed'):
                f.unlink()
            print("✅ Knowledge base resettata")
        else:
            print("Annullato")


if __name__ == '__main__':
    main()
