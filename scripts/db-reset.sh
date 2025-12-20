#!/bin/bash

# =====================================================
# NUR: LIFE RPG - Database Reset Script
# =====================================================
# Esegue il reset completo del database e applica
# le nuove migrazioni.
#
# Uso: ./scripts/db-reset.sh
# =====================================================

set -e

echo "=========================================="
echo "NUR: LIFE RPG - Database Reset"
echo "=========================================="
echo ""

# Verifica che siamo nella directory corretta
if [ ! -f "package.json" ]; then
    echo "Errore: Esegui questo script dalla root del progetto"
    exit 1
fi

# Verifica che le variabili siano settate
if [ -z "$SUPABASE_DB_URL" ] && [ -z "$DATABASE_URL" ]; then
    echo "Errore: Imposta SUPABASE_DB_URL o DATABASE_URL"
    echo ""
    echo "Esempio:"
    echo "  export SUPABASE_DB_URL='postgresql://postgres:password@db.xxx.supabase.co:5432/postgres'"
    echo ""
    exit 1
fi

DB_URL="${SUPABASE_DB_URL:-$DATABASE_URL}"

echo "1. Esecuzione reset database..."
psql "$DB_URL" -f scripts/reset-database.sql

echo ""
echo "2. Applicazione nuova migrazione schema..."
psql "$DB_URL" -f supabase/migrations/001_nur_life_v1.sql

echo ""
echo "3. Applicazione seed data (aree + achievements)..."
psql "$DB_URL" -f supabase/migrations/002_seed_life_areas.sql

echo ""
echo "=========================================="
echo "Reset completato!"
echo "=========================================="
echo ""
echo "Prossimi step:"
echo "1. Verifica il database su Supabase Dashboard"
echo "2. Testa la creazione di un nuovo utente"
echo "3. Verifica che le 10 life_areas vengano create"
echo ""
