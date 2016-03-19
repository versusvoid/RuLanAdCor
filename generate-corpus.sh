#!/bin/sh

DIR=$(dirname $0)

mkdir -p $DIR/data/output

$DIR/process-yaca.py
$DIR/process-appstore.py
$DIR/join.py
