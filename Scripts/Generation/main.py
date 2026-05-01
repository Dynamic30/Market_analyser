from Scripts.Generation.processed import main_script




stock_name = input("Enter Stock/Stocks Name (spacce seprated) : ").upper().split(" ")


for i in stock_name:
    main_script(i)