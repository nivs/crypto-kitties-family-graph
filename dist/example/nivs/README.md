#cd ../scripts
#python3 -m venv .venv
#source .venv/bin/activate
#python3 -m pip install requests

python3 ../scripts/ck_fetch.py --ids-file nivs_kitty_ids.txt -vv --parents 0 --children 0 --out nivs.json