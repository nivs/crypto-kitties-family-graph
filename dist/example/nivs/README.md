#cd ./tools
#python3 -m venv .venv
#source .venv/bin/activate
#python3 -m pip install requests

python3 ck_fetch.py --ids-file ../dist/example/nivs/nivs_kitty_ids.txt -vv --parents 0 --children 0 --out ../dist/example/nivs/nivs.json
#python3 download_svgs.py ../dist/example/nivs/nivs.json -o ../dist/example/nivs/svg/ --skip-existing
#-
python3 ck_fetch.py --ids-file ../dist/example/nivs/nivs_kitty_ids.txt -vv --parents 30 --children 0 --out ../dist/example/nivs/nivs_full_parents.json
#python3 download_svgs.py ../dist/example/nivs/nivs_full_parents.json -o ../dist/example/nivs/svg_full_parents/ --skip-existing
python3 prune_to_ancestors.py ../dist/example/nivs/nivs_full_parents.json --shortest -o ../dist/example/nivs/nivs_shortest_path.json
python3 prune_to_ancestors.py ../dist/example/nivs/nivs_full_parents.json --matron -o ../dist/example/nivs/nivs_matron_line.json
python3 prune_to_ancestors.py ../dist/example/nivs/nivs_full_parents.json --sire -o ../dist/example/nivs/nivs_sire_line.json
#-
python3 ck_fetch.py --ids-file ../dist/example/nivs/nivs_kitty_ids.txt -vv --parents 30 --children 1 --out ../dist/example/nivs/nivs_full_parents_plus_one_child.json

python3 ck_fetch.py --ids "174756,275808" -vv --parents 0 --children 1 --embedded-only --out ../dist/example/holidays/holidays.json
#python3 download_svgs.py ../dist/example/holidays/holidays.json -o ../dist/example/holidays/svg/ --skip-existing

python3 ck_fetch.py --ids "100000,500000" -vv --parents 1 --children 1 --embedded-only --out ../dist/example/milestones/milestones.json
#python3 download_svgs.py ../dist/example/milestones/milestones.json -o ../dist/example/milestones/svg/ --skip-existing
python3 ck_fetch.py --ids "100000,200000,300000,400000,500000,600000,700000,800000,900000,1000000" -vv --parents 1 --children 1 --embedded-only --out ../dist/example/milestones/milestones1M.json
#python3 download_svgs.py ../dist/example/milestones/milestones1M.json -o ../dist/example/milestones1M/svg/ --skip-existing

python3 ck_fetch.py --ids "1,4,18" -vv --parents 0 --children 1 --embedded-only --out ../dist/example/founders/founders.json
#python3 download_svgs.py ../dist/example/founders/founders.json -o ../dist/example/founders/svg/ --skip-existing
python3 ck_fetch.py --ids "1,4,18,100,101,102" -vv --parents 0 --children 1 --out ../dist/example/founders/founders_extended.json

python3 ck_fetch.py --ids 896775 -vv --parents 1 --children 0 --out ../dist/example/dragon/dragon.json
#python3 download_svgs.py ../dist/example/dragon/dragon.json -o ../dist/example/dragon/svg/ --skip-existing
python3 ck_fetch.py --ids "1018370" -vv --parents 5 --children 2 --out ../dist/example/dragon/dragon_extended.json

#Find Tier IIII kitties, save IDs, then fetch full data with ancestry
python3 find_rare_traits.py --tier IIII --limit 10 --ids-file ../dist/example/tier_iiii/tier_iiii_ids.txt
python3 ck_fetch.py --ids-file ../dist/example/tier_iiii/tier_iiii_ids.txt -vv --parents 3 --out ../dist/example/tier_iiii/tier_iiii.json

#Find Tier III kitties, save IDs, then fetch full data with ancestry
python3 find_rare_traits.py --tier III --limit 10 --ids-file ../dist/example/tier_iii/tier_iii_ids.txt
python3 ck_fetch.py --ids-file ../dist/example/tier_iii/tier_iii_ids.txt -vv --parents 3 --out ../dist/example/tier_iii/tier_iii.json

#Search for a specific trait (liger is Tier IIII body)
python3 find_rare_traits.py --trait liger --limit 5 --ids-file ../dist/example/liger/liger_ids.txt
python3 ck_fetch.py --ids-file ../dist/example/liger/liger_ids.txt -vv --parents 3 --out ../dist/example/liger/liger.json

#Find diamond gem kitties (first discoverers of mewtations)
python3 find_rare_traits.py --diamonds --ids-file ../dist/example/diamonds/diamond_ids.txt
python3 ck_fetch.py --ids-file ../dist/example/diamonds/diamond_ids.txt -vv --parents 3 --out ../dist/example/diamonds/diamonds.json