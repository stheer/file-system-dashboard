from flask import Flask, render_template, request, redirect
import logging
import os
import time

NVIapp = Flask(__name__)
NVIapp.secret_key = 'r29J}K`Tc(w;Fk>*#u"7LR*OH#G7.t'
NVIapp.config['UPLOAD_FOLDER'] = 'static/uploads'
formats = ['xlsx', 'xls', 'xlsm', 'pdf', 'txt', 'doc']
app_host_ip = '0.0.0.0'
app_host_port = 8000
SCOPES = ['https://www.googleapis.com/auth/drive']

@NVIapp.route('/')
def index():
    return render_template('home.html')

@NVIapp.route('/library')
def library():
    return render_template('file.html')

@NVIapp.route('/notes')
def notes():
    return render_template('notes.html')

@NVIapp.route('/validate', methods=['POST'])
def validate():
    args = request.json
    print(args)
    return redirect('/')

def main():
    if not os.path.exists('log'):
        os.mkdir('log')
    logging.basicConfig(filename='log/error_{}.log'.format(time.strftime("%Y%m%d%H%M%S", time.localtime())), level=logging.NOTSET)
    console = logging.StreamHandler()
    console.setLevel(logging.DEBUG)
    logging.getLogger("werkzeug").addHandler(console)

    NVIapp.run(host = app_host_ip, port= app_host_port, debug=True)

if __name__== '__main__':
    main()

