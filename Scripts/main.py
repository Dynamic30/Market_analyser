import time
from Scripts.Depcricated_code.csv_gen import daily_csv


while True:
    try:
        stock_num = int(input("Enter number of stocks"))
        break
    except:
        print("Enter a number !!! ")

names = []

for i in range(stock_num):
    name = input("Enter stock name(NSE)").upper()
    names.append(name)

for stock in names:
    name = stock
    end_date = '2023-01-18'  # for production cahnge it to today's date using datetime 
    print(name,'|',end_date,'|',stock_num)    
    daily_csv(name,end_date)
    time.sleep( 2)