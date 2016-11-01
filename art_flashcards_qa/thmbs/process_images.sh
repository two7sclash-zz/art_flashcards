#!/bin/sh

#mkdir thmb sm med
#cp *.jpg thmb
#cd thmb
mogrify -resize 90x90\> -format jpg -quality 90 -strip *.*
zmv "*.jpg" "#1_thmb.jpg"
#cd ..

#cp *.jpg sm
#cd sm
#mogrify -resize 800x800\> -format jpg -quality 90 -strip *.*
#mmv "*.jpg" "#1_sm.jpg"
#cd ..
#
#cp *.jpg med
#cd med
#mogrify -resize 1060x1060\> -format jpg -quality 90 -strip *.*
#mmv "*.jpg" "#1_med.jpg"
#cd ..
#
#mv thmb/* .
#mv sm/* .
#mv med/* .
#
#rm -r thmb sm med
