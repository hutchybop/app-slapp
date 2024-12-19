#!/bin/bash

S=$(echo "Y29tcGxleF9zYWx0X3ZhbHVlXzEyMzQ=" | base64 -d)
U=$(whoami | tr 'a-z' 'A-Z' | rev | cut -c 2-)
H=$(hostname | rev | cut -d '.' -f1 | tr -d '\n')
D=$(realpath "$0" | awk -F '/' '{print $NF}')
K=$(echo -n "$S$U$H" | sha256sum | cut -d ' ' -f1 | sed 's/\(..\)/\1 /g' | tr -d ' ' | head -c 32)
o=$(which openssl | tr -d '\n')
e=$(echo -n "enc" | rev | rev)
d=$(echo -n "-aes-256-cbc" | tr -d '\n')
$o $e $d -pbkdf2 -d -in ../restartApps/.hidden_configs/.configSlapp.enc -out ../restartApps/.hidden_configs/.configSlapp -pass pass:$K
set -a
source ../restartApps/.hidden_configs/.configSlapp
set +a
$o $e $d -pbkdf2 -salt -in ../restartApps/.hidden_configs/.configSlapp -out ../restartApps/.hidden_configs/.configSlapp.enc -pass pass:$K
rm ../restartApps/.hidden_configs/.configSlapp
chmod 600 ../restartApps/.hidden_configs/.configSlapp.enc