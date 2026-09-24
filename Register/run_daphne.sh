#!/bin/bash

# Fayl joylashgan papkaga o‘tamiz
cd "$(dirname "$0")"

# Virtual muhitni faollashtiramiz
source venv/bin/activate

# Daphne serverni ishga tushiramiz
exec daphne -b 0.0.0.0 -p 8001 core.asgi:application
