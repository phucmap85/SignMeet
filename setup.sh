#!/bin/bash

sudo apt update -y && sudo apt upgrade -y && sudo apt install ffmpeg htop neovim nano -y
mkdir -p ~/miniconda3
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O ~/miniconda3/miniconda.sh
yes | sudo bash ~/miniconda3/miniconda.sh -b -u -p ~/miniconda3
rm -rf ~/miniconda3/miniconda.sh
source ~/miniconda3/etc/profile.d/conda.sh
conda init
yes | conda create -n env python=3.10
conda activate env
pip install -r requirements.txt
wget https://download.packetriot.com/linux/debian/buster/stable/non-free/binary-amd64/pktriot-0.15.1.amd64.deb
sudo dpkg -i pktriot-0.15.1.amd64.deb
rm -rf pktriot-0.15.1.amd64.deb
sudo mkdir -p $HOME/.pktriot
sudo mv -f config.json $HOME/.pktriot/config.json
sudo chmod +x $HOME/.pktriot
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list && sudo apt update && sudo apt install ngrok
ngrok config add-authtoken 1lurM0IwQS14L2sz2BB6WGNrY8Z_52DTq5esWceFmxgBG8GZk
