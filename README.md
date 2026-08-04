# Market_analyser

# Folder Strucutre

## !! always run like this -> python Scripts/main.py

## Run Scripts/Generation/seed_db.py to create the postgress and its table
Scripts
    main.py |OR| Dashboard.py
    processed.py
    Snetiments.py
    LLM.py
DATA
    JSON_DATA
        struc.josn
        date/company_name/json_files.json
    Sentiments_Data
    Outputs

MongoDB Database Strucutre
    Format 
    /collections
        /documents
    
    Financial_Data
    News_Sentiment
    Social_media_sentiments


# Workflow
should contain how to script should be runned and how to start up the project and all the other setups (how to set up crontabs etc)