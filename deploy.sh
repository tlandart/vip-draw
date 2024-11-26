# run this while SSHed into the server VM
docker build --squash -t frontend -f frontend.dockerfile .

docker build --squash -t backend -f backend.dockerfile .

docker compose down --remove-orphans

docker rmi $(docker images --filter "dangling=true" -q --no-trunc)

docker compose up -d