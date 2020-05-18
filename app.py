from flask import Flask, render_template, request, jsonify
from database import db_session, Permissions, Users
import logging
import os
import time
import pandas as pd

NVIapp = Flask(__name__)
NVIapp.secret_key = 'r29J}K`Tc(w;Fk>*#u"7LR*OH#G7.t'
app_host_ip = '0.0.0.0'
app_host_port = 8000

@NVIapp.route('/')
def index():
    return render_template('home.html')

@NVIapp.route('/library')
def library():
    return render_template('file.html')

@NVIapp.route('/notes')
def notes():
    return render_template('notes.html')

@NVIapp.route('/settings')
def settings():
    return render_template('settings.html')

@NVIapp.route('/validate', methods=['POST'])
def validate():
    args = request.json
    user = args['email'].split("@")[0]
    user_permission = Users.query.filter_by(username=user).first()
    if user_permission is not None:
        user_permission_title = user_permission.permission
        resp = jsonify(permission=user_permission_title)
    else:
        resp = jsonify(permission=None)
    return resp

@NVIapp.route('/getUsers', methods=['POST'])
def getUsers():
    args = request.json
    if args['user'] == 'all':
        all_users = Users.query.all()
        users = pd.DataFrame(columns=['user', 'permission'])
        for user in all_users:
            users = users.append({'user': user.username, 'permission': user.permission}, ignore_index=True)
        print(users)
        resp = users.to_json()
    else:
        user = Users.query.filter_by(username=args['user']).first()
        print(user)
        resp = jsonify(user)
    return resp

@NVIapp.route('/removeUser', methods=['POST'])
def removeUser():
    args = request.json
    Users.query.filter_by(username=args['username']).delete()
    db_session.commit()
    resp = jsonify(success=True)
    return resp

@NVIapp.route('/addUser', methods=['POST'])
def addUser():
    args = request.json
    new_user = Users(username=args['username'], permission=args['permission'])
    db_session.add(new_user)
    db_session.commit()
    resp = jsonify(success=True)
    return resp

@NVIapp.route('/setPermission', methods=['POST'])
def setPermissions():
    args = request.json
    new_folder = Permissions(folder_id=args['folder_id'], permission=args['permission'], folder_name=args['folder_name'])
    db_session.add(new_folder)
    db_session.commit()
    resp = jsonify(success=True)
    return resp

@NVIapp.route('/updatePermission', methods=['POST'])
def updatePermissions():
    args = request.json
    folder_permission = Permissions.query.filter_by(folder_id=args['folder_id']).first()
    if folder_permission is not None:
        folder_permission.permission = args['permission']
        db_session.commit()
        resp = jsonify(success=True)
    else:
        new_folder = Permissions(folder_id=args['folder_id'], permission=args['permission'], folder_name=args['folder_name'])
        db_session.add(new_folder)
        db_session.commit()
        resp = jsonify(success=True)
    return resp

@NVIapp.route('/findPermission', methods=['POST'])
def findPermissions():
    args = request.json
    folder_permission = Permissions.query.filter_by(folder_id=args['folder_id']).first()
    if folder_permission is not None:
        folder_permission_title = folder_permission.permission
        print(folder_permission_title)
        resp = jsonify(permission=folder_permission_title)
    else:
        resp = jsonify(permission=None)
    return resp

@NVIapp.route('/deletePermission', methods=['POST'])
def deletePermissions():
    args = request.json
    Permissions.query.filter_by(folder_id=args['folder_id']).delete()
    db_session.commit()
    resp = jsonify(success=True)
    return resp

@NVIapp.teardown_appcontext
def shutdown_session(exception=None):
    db_session.remove()

def main():
    if not os.path.exists('log'):
        os.mkdir('log')
    logging.basicConfig(filename='log/error_{}.log'.format(time.strftime("%Y%m%d%H%M%S", time.localtime())), level=logging.NOTSET)
    console = logging.StreamHandler()
    console.setLevel(logging.DEBUG)
    logging.getLogger("werkzeug").addHandler(console)

    for item in db_session.query(Permissions.folder_id, Permissions.permission, Permissions.folder_name):
        print(item)

    NVIapp.run(host = app_host_ip, port= app_host_port, debug=True, ssl_context=context)

if __name__== '__main__':
    context = ('server.crt', 'server.key')
    main()

