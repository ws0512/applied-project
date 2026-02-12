-----API Server------

copy the nodejs folder onto your own device.

open the terminal/cmd

change directory into that folder ```cd {path}/nodejs``` example "cd c:/Users/g4l4x/Desktop/nodejs"

start the server with ```node ./main.js```



if you get an error "command 'node' not found", then download nodejs from https://nodejs.org/en/




------Database-------

install PostgreSQL version 18.1 from https://www.enterprisedb.com/downloads/postgres-postgresql-downloads

right click on 'pgadmin 4' and go to the file location copy the path of the folder and in the terminal type ```cd {path}``` 
example -> cd "C:\Program Files\PostgreSQL\18\pgAdmin 4\runtime"

paste this command to create a temporary database ```.\psql.exe -U postgres -d postgres -c "CREATE DATABASE new_database OWNER postgres ENCODING 'UTF8';"``` ('.\psql.exe' may be './psql' on mac)

(it will ask for the password for the user postgres which is the password you set during installation)

and then run this command ```.\psql.exe -U postgres -d new_database -f {PATH_TO_THE_SQL_FILE}``` 
example -> .\psql.exe -U postgres -d new_database -f "C:\Users\g4l4x\Downloads\initialbackup.sql"


to check if it cloned the database correctly open "PgAdmin 4"
login as 'postgres' with the password you set during installation and on the left hand navigate through Servers > PostgreSQL 18 > Databases > main > Schemas > public > Tables. now Right click on Crime > View/Edit data > all rows. This should show you all of the points where a crime has occurred with the latitude and longitude coordinates. 
its truncated to 1000 rows, you can extend it to 10,000 rows by editing the range.

the database SHOULD* automatically start on os boot


----- website -----

to open the website make sure to start the NodeJS server as shown above. and that the database has been created successfully.

go to your browser and there enter 
"localhost:3000"

OR

open terminal and on windows type in "ipconfig" and find IPv4 Address 
Example
```Wireless LAN adapter WiFi:

   Connection-specific DNS Suffix  . : lboro.ac.uk
   IPv4 Address. . . . . . . . . . . : 10.111.000.000
   Subnet Mask . . . . . . . . . . . : 255.255.0.0
   Default Gateway . . . . . . . . . : 10.111.0.1
```

or MacOS
```ipconfig getifaddr en0``` (en1 if you are on ethernet)

use this IP address to connect to the website by typing the address  into the browser followed by ':3000'
example ```10.111.000.000:3000```



