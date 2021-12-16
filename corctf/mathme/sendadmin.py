#!/bin/python3

import requests
import sys

admin_url = 'https://adminbot.be.ax/mathme'

def send(url):
    res = requests.post(admin_url, data = {'url':url})
    return res

if __name__=="__main__":
    if len(sys.argv):
        res = send(sys.argv[1])
        print(res.text)
