#!/bin/python3

import requests
import sys

url = 'https://adminbot.be.ax/blogme?url={}'

def send(u):
    r = requests.post(url.format(u), data={'url': u})
    return r


if __name__=="__main__":
    if len(sys.argv) > 1:
        res = send(sys.argv[1])
        print(res.text)
