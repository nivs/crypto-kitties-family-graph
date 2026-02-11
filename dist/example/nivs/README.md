#cd ./tools
#python3 -m venv .venv
#source .venv/bin/activate
#python3 -m pip install requests

python3 ck_fetch.py --ids-file ../dist/example/nivs/nivs_kitty_ids.txt -vv --parents 0 --children 0 --out ../dist/example/nivs/nivs.json

python3 download_svgs.py ../dist/example/nivs/nivs.json -o ../dist/example/nivs/svg/ --skip-existing


python3 ck_fetch.py --ids "174756,275808" -vv --parents 0 --children 1 --embedded-only --out ../dist/example/holidays/holidays.json
python3 download_svgs.py ../dist/example/holidays/holidays.json -o ../dist/example/holidays/svg/ --skip-existing

python3 ck_fetch.py --ids "100000,500000" -vv --parents 1 --children 1 --embedded-only --out ../dist/example/milestones/milestones.json
python3 download_svgs.py ../dist/example/milestones/milestones.json -o ../dist/example/milestones/svg/ --skip-existing

python3 ck_fetch.py --ids "100000,200000,300000,400000,500000,600000,700000,800000,900000,1000000" -vv --parents 1 --children 1 --embedded-only --out ../dist/example/milestones/milestones1M.json
python3 download_svgs.py ../dist/example/milestones/milestones1M.json -o ../dist/example/milestones1M/svg/ --skip-existing

python3 ck_fetch.py --ids "1,4,18" -vv --parents 0 --children 1 --embedded-only --out ../dist/example/founders/founders.json
python3 download_svgs.py ../dist/example/founders/founders.json -o ../dist/example/founders/svg/ --skip-existing

python3 ck_fetch.py --ids 896775 -vv --parents 1 --children 0 --out ../dist/example/dragon/dragon.json
python3 download_svgs.py ../dist/example/dragon/dragon.json -o ../dist/example/dragon/svg/ --skip-existing
