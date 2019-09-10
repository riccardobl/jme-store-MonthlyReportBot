#!/bin/bash
NAME="jmestorereport"
cd "`dirname $0`"
set -e

if [ -d "/mnt/c/Users" ]; then
    echo "Running on windows 10"
    export PATH="$HOME/bin:$HOME/.local/bin:$PATH"
    export PATH="$PATH:/mnt/c/Program\ Files/Docker/Docker/resources/bin"
    alias docker=docker.exe
fi

RUN_AS=""
userUID=""
groupUID=""

# Use non sudo user in docker, this will preserve files' permissions
if [ "$SUDO_USER" != "" ];
then
    userUID=`id -u $SUDO_USER`
    groupUID=`id -g $SUDO_USER`
    RUN_AS="-u=$userUID:$groupUID"
else
    userUID=`id -u`
    groupUID=`id -g`
    RUN_AS=""
fi


docker rmi $NAME || true
docker build -t $NAME src/


if [ "$SUDO_USER" != "" ];
then
    chown -Rf $userUID:$groupUID src/data
fi

args=""

if [ "$1" != "" ];
then
    args="$args -eAPI_USER=$1"
fi


if [ "$1" != "" ];
then
    args="$args -eAPI_KEY=$2"
fi

if [ "$HEADLESS" = "" ];
then
    args="$args -it"
fi

cmd="docker run $RUN_AS $args -v$PWD/src/data:/app/data --rm   $NAME"
echo $cmd
eval $cmd