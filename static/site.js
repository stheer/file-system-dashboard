var searchFilters = 0;
var lastInput = '';
var selectedFilters = [];
var CLIENT_ID = config.CLIENT_ID;
var API_KEY = config.API_KEY;
var DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
var SCOPES = 'https://www.googleapis.com/auth/drive';
var parentFolder = " and 'shared-drives' in parents and '0AF0hsatILwu6Uk9PVA' in parents";
var FOLDER_ID = '0AF0hsatILwu6Uk9PVA';
var SHARED_DRIVE = 'DC Office Drive';
var SHARED_DRIVE_ID = '';
var fileNum = 500;
var currentFolder = '';
var currentFile = '';
var removedFlag = true;
var subFolderArray = [], parentArray = [], parentArrayIDs = [], clickedFolders = [], poppedFolders = [00];
var fileCounter = 0;
var fileClicked = false;
var exportDict = {
    'application/vnd.google-apps.spreadsheet': 'application/x-vnd.oasis.opendocument.spreadsheet',
    'application/vnd.google-apps.document': 'application/vnd.oasis.opendocument.text',
    'application/msword': 'application/vnd.oasis.opendocument.text',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/html': 'text/plain',
    'image/jpeg': 'image/jpeg',
    'image/png': 'image/png',
    'application/pdf': 'application/pdf',
    'application/vnd.ms-excel': 'application/x-vnd.oasis.opendocument.spreadsheet',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.google-apps.shortcut': 'application/x-vnd.oasis.opendocument.spreadsheet'
}
var permissionBuckets = ['Public', 'Team', 'Admin'];
var userPermission = '';
var subFolderArrayPermissions = [];
var filePermissions = [];
var parentFoldersID = [];
var parentFoldersNames = [];
var searchCount = 0;
var savedQuery;

function create2DArray(rows){
    var arr = [];
    for(var i=0; i<rows; i++){
        arr[i] = [];
    }
    return arr;
}

function fileType(googleFile){
    var type = 'other';
    if(googleFile.search('google-apps.document') > 0 || googleFile == 'application/msword'){
        type = '.doc';
    } else if(googleFile == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'){
        type = '.docx';
    } else if(googleFile.search('spreadsheet') > 0){
        type = '.xlsx';
    } else if(googleFile.search('spreadsheet') > 0){
        type = '.csv';
    } else if(googleFile.search('google-apps.form') > 0){
        type = 'google form';
    } else if(googleFile == 'application/pdf'){
        type =  '.pdf';
    } else if(googleFile.search('presentation') > 0){
        type = '.pptx';
    } else if(googleFile == 'video/quicktime'){
        type = '.mov';
    } else if(googleFile == 'image/jpeg'){
        type = '.jpg';
    } else if(googleFile.search('folder') > 0){
        type = 'folder';
    }
    return type;
}

function removeLast(arr, n){
    arr.splice(arr.length-n, arr.length);
    return arr;
}

function handleClientLoad() {
    gapi.load('client:auth2', initClient);
}

function initClient() {
    gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: DISCOVERY_DOCS,
        scope: SCOPES
    }).then(function () {
        gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
        updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
        document.getElementById('login_button').onclick = handleAuthClick;
        document.getElementById('signout_button').onclick = handleSignoutClick;
    }, function(error) {
        alert('Sign-in Error: ' + error);
    });
}

function updateSigninStatus(isSignedIn, currentUser) {
    if (isSignedIn) {
        document.getElementById('login_button').style.display = 'none';
        document.getElementById('signout_button').style.display = 'inline-block';
        googleUser = gapi.auth2.getAuthInstance().currentUser.get();
        var access_token =  gapi.auth.getToken()
        var id_token = googleUser.getAuthResponse().id_token;
        $.ajax('https://oauth2.googleapis.com/tokeninfo?id_token='+id_token,
        {
        type: 'GET',
        success: function(data){
            $.ajax({
                type: 'POST',
                url: '/validate',
                data: JSON.stringify({
                    aud: data['aud'],
                    email: data['email'],
                    name: data['name']
                }),
                dataType: "json",
                contentType: "application/json; charset=utf-8",
                success: function(data){
                    userPermission = data['permission'];
                    restrictAccess(userPermission);
                },
                error: function(error){
                    alert('Could not query user permissions!');
                }
            });
        }
        });

        $('#folder-select').prop('disabled', false);

        var request = gapi.client.drive.drives.list({});
        request.execute(function (resp) {
            if (!resp.error) {
                var drives = resp.result.drives;
                for(var i=0; i<drives.length; i++){
                    if(drives[i].name == SHARED_DRIVE){
                        SHARED_DRIVE_ID = drives[i].id;
                    }
                }
                if(SHARED_DRIVE_ID == ''){
                    alert("Cannot access database! Please Either: \n \t1) Request shared drive access\n \tor\n \t2) Update 'Shared Drive Name' in Preferences");
                    $('#folder-select').attr('disabled', true);
                }
            }else{
                alert("Cannot Load Drives!");
            }
        });
    } else {
        $('#settings-button').hide();
        $('#folder-select').prop('disabled', true);
        document.getElementById('login_button').style.display = 'inline-block';
        document.getElementById('signout_button').style.display = 'none';
    }
}

function handleAuthClick(event) {
    gapi.auth2.getAuthInstance().signIn();
}

function restrictAccess(userPermission){
    if(userPermission == 'Admin'){
        $('#settings-button').show();
    }else if(userPermission == 'Public'){
        $('#create-folder').hide();
        $('#upload-file').hide();
    }
}

function handleSignoutClick(event) {
    $('#file-div').hide();
    $('#file-options-buttons').hide();
    $('#search-bottom').hide();
    $('#library-bottom').hide();
    $('#folder-select').val('');
    $('#folder-select').attr('disabled', true);
    $('#sub-folder-list').empty();
    $('#sub-folder-trash').empty();
    $('h4').hide();
    $('#sub-folder-table').hide();
    $('#settings-button').hide();
    if(window.location.href.includes('/settings')){
        window.location.href = '/';
    }
    gapi.auth2.getAuthInstance().signOut();
}

function appendPre(message) {
    var textContent = document.createTextNode(message + '\n');
    pre.appendChild(textContent);
}

function noFilesMessage() {
    $('.file-header').hide();
    $('.list').empty();
    $('#file-list').html('<br><br><br>No files...');
}

function showSuccessAndEmpty(parent) {
    var success = parent.charAt(0).toUpperCase() + parent.slice(1);
    if(parent == 'folder' || parent == 'file'){
        $('#'+parent+'-form').hide();
        $('#success-message').append(success+' Succesfully Created!');
        $('#close-'+parent).prop('disabled', false);
    } else if(parent == 'files'){
        $('#file-form').hide();
        $('#success-message').append(success+' Succesfully Created!');
        $('#close-file').prop('disabled', false);
    } else if(parent == 'trash') {
        $('#trash-files').hide();
        $('#success-message').append('Files Removed!');
    } else{
        $('#delete-folder').hide();
        $('#success-message').append('Folder Removed!');
    }
    $('#success-message').show();
    setTimeout(function() {
            $('#success-message').hide();
            $('#success-message').empty();
            $('#folder-name').val("");
            $('#file-form').val("");
    }, 2000);
    $('#file-table').hide();
    if(parent == 'trash' || parent == 'file' || parent == 'files'){
        var queryFlag;
        if($('#folder-select').val() == 'Search'){
            queryFlag = savedQuery;
        }else{
            queryFlag = null;
        }
        listFiles(currentFolder, null, false, queryFlag);
    } else if(parent == 'folder'){
        setTimeout(function() {
            $('#folder-select').trigger('change');
        }, 1000);
    }else{
        setTimeout(function() {
            $('#folder-select').trigger('change');
        }, 1000);
    }
    $('#file-table').show();
}

function showSuccessAndUpdateUser(action) {
    if(action == 'trash'){
        $('#user-success-message').append('User Removed!');
        $('#trash-users').hide();
    }else if(action == 'add'){
        $('#user-success-message').append('User Added!');
        $('#new-user-name').val('');
        $('#new-user-permission').val('');
    }
    $('#user-success-message').show();
    setTimeout(function() {
            $('#user-success-message').hide();
            $('#user-success-message').empty();
            loadUsers();
    }, 2000);
}

function folderPermissionWrapper(file){
    return getFolderPermission(file).then();
}

function getFolderPermission(file){
    const promiseSub = new Promise((resolve, reject) => {
        $.ajax({
            type: 'POST',
            url: '/findPermission',
            data: JSON.stringify({
                folder_id: file.id
            }),
            dataType: "json",
            contentType: "application/json; charset=utf-8",
            success: function(data) {
                subFolderArrayPermissions.push(data['permission']);
                resolve('success');
            },
            error: function(error) {
                console.log(error);
                subFolderArrayPermissions.push(null);
                reject('error');
            }
        });
    });
    return promiseSub;
}

function getFileParents(file){
    var access_token = gapi.auth.getToken().access_token;
    const promiseFile = new Promise((resolve, reject) => {
        var request = gapi.client.request({
            'path': 'https://www.googleapis.com/drive/v3/files/'+file.id,
            'headers': {
                'Authorization': 'Bearer ' + access_token
            },
            'params': {
                'supportsAllDrives': true,
                'fields': 'parents'
            }
        });
        request.execute(function(resp) {
            if (!resp.error) {
                var parentFolder = resp.parents[0];
                parentFoldersID.push(parentFolder);
                $.ajax({
                    type: 'POST',
                    url: '/findPermission',
                    data: JSON.stringify({
                        folder_id: parentFolder
                    }),
                    dataType: "json",
                    contentType: "application/json; charset=utf-8",
                    success: async function(data) {
                        filePermissions.push(data['permission']);
                        await getFolderName(parentFolder);
                        resolve('success');
                    }
                });
            }else{
                console.log('Cant access parent of ' + file.id);
                filePermissions.push(null);
                reject('error');
            }
        });
    });
    return promiseFile;
}

function getFolderName(folderId){
    var access_token = gapi.auth.getToken().access_token;
    const promiseFolderName = new Promise((resolve, reject) => {
        var request = gapi.client.request({
            'path': 'https://www.googleapis.com/drive/v3/files/'+folderId,
            'headers': {
                'Authorization': 'Bearer ' + access_token
            },
            'params': {
                'supportsAllDrives': true,
                'fields': 'name'
            }
        });
        request.execute(function(resp) {
            if (!resp.error) {
                parentFoldersNames.push(resp.name);
                resolve('success');
            }else{
                parentFoldersNames.push(null);
                reject('error');
            }
        });
    });
    return promiseFolderName;
}

function listFiles(folder, e, loadSubFolders, queryArray) {
    if(queryArray == null){
        $('.loadDisable').attr('disabled', true);
        fileCounter = 0;
        if (e!=null){
            clickedFolders.push(e.currentTarget.id.split('-')[1]);
        }
        if (parentArray.length == 0){
            var query = "trashed=false and mimeType='application/vnd.google-apps.folder' and name='"+folder+"'";
        } else {
            var parent = parentArray[parentArray.length - 1];
            var query = "trashed=false and mimeType='application/vnd.google-apps.folder' and name='"+folder+"' and '"+parent+"' in parents";
        }
        var request = gapi.client.drive.files.list({
            'pageSize': fileNum,
            'q': query,
            'fields': "nextPageToken, files(id)",
            'corpora': 'drive',
            'driveId': SHARED_DRIVE_ID,
            'supportsAllDrives': true,
            'includeItemsFromAllDrives': true
        });
        request.execute(function (resp) {
           if (!resp.error) {
                var folder = resp.result.files[0];
                try{
                    window.FOLDER_ID = folder.id;
                } catch (error) {
                    if (e!=null) {
                        setTimeout(function() {
                            $('#folder-select').trigger('change');
                        }, 1500);
                        return;
                    }
                }
                if(e != null){
                    let localPermission = permissionBuckets.slice();
                    $.ajax({
                        type: 'POST',
                        url: '/findPermission',
                        data: JSON.stringify({
                            folder_id: window.FOLDER_ID
                        }),
                        dataType: "json",
                        contentType: "application/json; charset=utf-8",
                        success: function(data) {
                            if(userPermission != 'Public'){
                                if(data['permission'] != null){
                                    localPermission.splice(localPermission.indexOf(data['permission']), 1);
                                    $(e.currentTarget.parentElement).append("\t <select id='"+window.FOLDER_ID+"' class='subFolder-permission loadDisable' disabled><option value='"+data['permission']+"' selected>"+data['permission']+"</option><option value='"+localPermission[0]+"'>"+localPermission[0]+"</option><option value='"+localPermission[1]+"'>"+localPermission[1]+"</option>");
                                }else{
                                    if(parentArray.length != 0){
                                        localPermission.unshift('null');
                                        var selectString = "\t <select id='"+window.FOLDER_ID+"' class='subFolder-permission loadDisable' disabled><option value='' selected disabled hidden>"+localPermission[0]+"</option>";
                                        for(var i=1; i<localPermission.length; i++){
                                            selectString = selectString + "<option value='"+localPermission[i]+"'>"+localPermission[i]+"</option>";
                                        }
                                        $(e.currentTarget.parentElement).append(selectString);
                                    }
                                }
                            }
                        },
                        error: function(XMLHttpRequest, textStatus, errorThrown) {
                            console.log(errorThrown);
                        }
                    });
                }

                query = "trashed=false and '"+window.FOLDER_ID+"' in parents";
                var request = gapi.client.drive.files.list({
                    'pageSize': fileNum,
                    'q': query,
                    'fields': "nextPageToken, files(id, name, mimeType, modifiedTime)",
                    'corpora': 'drive',
                    'driveId': SHARED_DRIVE_ID,
                    'supportsAllDrives': true,
                    'includeItemsFromAllDrives': true
                });
                request.execute(async function (resp) {
                    if (!resp.error) {
                        var files = resp.result.files;
                        var fileFlag = true;
                        var folderFlag = true;
                        subFolderArray = [];
                        subFolderArrayPermissions = [];

                        if (files && files.length > 0) {
                            $('.list').empty();
                            $('.file-header').show();
                            for (var i = 0; i < files.length; i++) {
                                var file = files[i];
                                var filename = file.name;
                                var type = file.name.substr(file.name.lastIndexOf('.'));
                                if(type.length > 1 && type.length < 6){
                                    var filename = file.name.replace(type,'');
                                }else{
                                    var type = fileType(file.mimeType);
                                }

                                if(type == 'folder'){
                                    folderFlag = false;
                                    await folderPermissionWrapper(file);
                                    subFolderArray.push(filename);
                                }else{
                                    fileFlag = false;
                                    fileCounter++;
                                    $('#file-list').append("<button value='"+file.id+"#"+file.mimeType+"' id=file-"+i+" class='file loadDisable'>"+filename+"</button>");
                                    $('#type-list').append("<div id=type-"+i+" class=type>"+type+"</div>");
                                    var d = new Date(Date.parse(file.modifiedTime));
                                    $('#date-list').append("<div id=date-"+i+" class=date>"+d.toLocaleDateString()+"</div>");
                                    if(userPermission != 'Public'){
                                        $('#delete-list').append("<input type='checkbox' class='trash-box loadDisable' id='box-"+i+"' value='"+file.id+"'>");
                                    }
                                }
                            }

                            if (folderFlag & e!=null){
                                $(e.currentTarget).addClass('click-error');
                                setTimeout(function() {
                                    $(e.currentTarget).removeClass('click-error');
                                }, 500);
                                poppedFolders.push(clickedFolders.pop());
                            }
                            if (fileFlag){
                                noFilesMessage();
                            }
                        } else {
                            noFilesMessage();
                            if (e!=null){
                                poppedFolders.push(clickedFolders.pop());
                                $(e.currentTarget).addClass('click-error');
                                setTimeout(function() {
                                    $(e.currentTarget).removeClass('click-error');
                                }, 500);
                            }
                        }

                        if (loadSubFolders){
                            showSubFolders(false);
                        }

                        $('.loadDisable').attr('disabled', false);
                        return;

                    }else{
                        alert("Error: " + resp.error.message);
                        $('.loadDisable').attr('disabled', false);
                        return;
                    }
                });
           }else{
                alert("Error: " + resp.error.message);
                $('.loadDisable').attr('disabled', false);
                return;
           }
        });
    }else{
        var query = "trashed=false";
        for(var i=0; i<queryArray.length; i++){
            if(queryArray[i][0] == 'Modified Date') {
                query = query+" and modifiedTime > '"+queryArray[i][1]+"'";
            }else if(queryArray[i][0] == 'File Contents'){
                query = query+" and fullText contains '"+queryArray[i][1]+"'";
            }else if(queryArray[i][0] == 'Folder'){
                query = query+" and '"+queryArray[i][1]+"' in parents";
            }else if(queryArray[i][0] == 'File Name'){
                query = query+" and name contains '"+queryArray[i][1]+"'";
            }else if(queryArray[i][0] == 'File Type'){
                var parsed = JSON.parse(queryArray[i][1]);
                for(j=0; j<parsed.length; j++){
                    if(j==0 && parsed.length > 1){
                        query = query+" and (mimeType ='"+parsed[j]+"'";
                    }else if(j==0 && parsed.length == 1){
                        query = query+" and mimeType ='"+parsed[j]+"'";
                    }else if(j > 0 && j == parsed.length - 1){
                        query = query+" or mimeType ='"+parsed[j]+"')";
                    }else if(j > 0 && j < parsed.length - 1){
                        query = query+" or mimeType ='"+parsed[j]+"'";
                    }
                }
            }else{
                continue;
            }
        }
        var request = gapi.client.drive.files.list({
            'pageSize': fileNum,
            'q': query,
            'fields': "nextPageToken, files(id, name, mimeType, modifiedTime)",
            'corpora': 'drive',
            'driveId': SHARED_DRIVE_ID,
            'supportsAllDrives': true,
            'includeItemsFromAllDrives': true
        });
        request.execute(async function (resp) {
            if (!resp.error) {
                var files = resp.result.files;
                var fileFlag = true;
                var folderFlag = true;
                subFolderArray = [];
                subFolderArrayPermissions = [];
                filePermissions = [];
                parentFoldersID = [];
                parentFoldersNames = [];

                if (files && files.length > 0) {
                    $('.list').empty();
                    $('.file-header').show();
                    for (var i = 0; i < files.length; i++) {
                        var file = files[i];
                        var filename = file.name;
                        var type = file.name.substr(file.name.lastIndexOf('.'));
                        if(type.length > 1 && type.length < 6){
                            var filename = file.name.replace(type,'');
                        }else{
                            var type = fileType(file.mimeType);
                        }

                        await getFileParents(file);

                        if(type == 'folder'){
                            folderFlag = false;
                            await folderPermissionWrapper(file);
                            subFolderArray.push(filename);
                        }else{
                            if((userPermission == 'Admin') || (filePermissions[i] == null) || (userPermission == 'Public' && filePermissions[i] == 'Public') || (userPermission == 'Team' && filePermissions[i] != 'Admin')){
                                $('#file-list').append("<button value='"+file.id+"#"+file.mimeType+"' id=file-"+i+" class='file loadDisable'>"+filename+"</button>");
                                $('#parent-folder-list').append("<div id=parent-folder-"+i+" class=parent-folder>"+parentFoldersNames[i]+"</div>");
                                $('#type-list').append("<div id=type-"+i+" class=type>"+type+"</div>");
                                var d = new Date(Date.parse(file.modifiedTime));
                                $('#date-list').append("<div id=date-"+i+" class=date>"+d.toLocaleDateString()+"</div>");
                                $('#delete-list').append("<input type='checkbox' class='trash-box loadDisable' id='box-"+i+"' value='"+file.id+"'>");
                                fileCounter++;
                                fileFlag = false;
                            }
                        }
                    }

                    if (folderFlag & e!=null){
                        $(e.currentTarget).addClass('click-error');
                        setTimeout(function() {
                            $(e.currentTarget).removeClass('click-error');
                        }, 500);
                        poppedFolders.push(clickedFolders.pop());
                    }
                    if (fileFlag){
                        noFilesMessage();
                    }
                } else {
                    noFilesMessage();
                    if (e!=null){
                        poppedFolders.push(clickedFolders.pop());
                        $(e.currentTarget).addClass('click-error');
                        setTimeout(function() {
                            $(e.currentTarget).removeClass('click-error');
                        }, 500);
                    }
                }

                if (loadSubFolders){
                    showSubFolders(true);
                }

                $('.loadDisable').attr('disabled', false);
                return;

            }else{
                alert("Error: " + resp.error.message);
                $('.loadDisable').attr('disabled', false);
                return;
            }
        });
    }
}

function showSubFolders(query){
    $('#sub-folder-list').hide();
    if(query == true){
        $('#sub-folder-list').empty();
        $('#sub-folder-trash').empty();
    }
    for (var i = 0; i < subFolderArray.length; i++) {
        if((userPermission == 'Admin') || (userPermission == 'Public' && subFolderArrayPermissions[i] == 'Public') || (userPermission == 'Team' && subFolderArrayPermissions[i] != 'Admin')){
            $('#sub-folder-list').append("<div class='subfolder-button-div' id='subfolder-div"+(parentArray.length+1)+i+"'><button value='"+subFolderArray[i]+"' class='sub-folder-link loadDisable' id='link-"+(parentArray.length+1)+i+"' style='margin-left:"+((parentArray.length+1)*(2))+"%'>/" +subFolderArray[i] + "</button></div>");
            if(userPermission != 'Public'){
                $('#sub-folder-trash').append("<input type='checkbox' class='folder-trash-box loadDisable visibility' id='folder-box-"+(parentArray.length+1)+i+"' value='"+subFolderArray[i]+"'>");
            }
            parentArrayIDs.push('link-'+(parentArray.length+1)+i);
        }
    }
    $('#sub-folder-list').show();
    $('#sub-folder-table').show();
    $('h4').show();
}

function addFileButtons(e, embedLink, downloadLink, editLink){
    fileClicked = true;
    if (currentFile != ''){
        clickedFileButton();
    }
    currentFile = e.currentTarget.id.split('-')[1];
    $(e.currentTarget).addClass('clicked');
    if (fileCounter > 1){
        $('#space-entry').append(' <br> ');
        $('#move-down-file').append($('#file-'+currentFile));
        $('#move-down-type').append($('#type-'+currentFile));
        $('#move-down-date').append($('#date-'+currentFile));
        $('#move-down-delete').append($('#box-'+currentFile));
        if($('#folder-select').val() == 'Search'){
            $('#move-down-folder').append($('#parent-folder-'+currentFile));
        }
    }
    $('.trash-box').prop('disabled', true);
    $('.folder-trash-box').prop('disabled', true);
    $('#file-options-preview').prop('value', embedLink);
    $('#file-options-download').prop('value', downloadLink);
    $('#file-options-edit').prop('value', editLink);

    $('#file-options-buttons').show();
}

function clickedFileButton(){
    if (fileCounter > 1){
        $('#space-entry').empty();
        $('#file-list').append($('#file-'+currentFile));
        $('#type-list').append($('#type-'+currentFile));
        $('#date-list').append($('#date-'+currentFile));
        $('#delete-list').append($('#box-'+currentFile));
        if($('#folder-select').val() == 'Search'){
            $('#parent-folder-list').append($('#parent-folder-'+currentFile));
        }
    }
    $('.file').each(function () {
        if($(this).hasClass('clicked')) {
            $(this).removeClass('clicked');
        }
    });
    $('.trash-box').prop('disabled', false);
    $('.folder-trash-box').prop('disabled', false);
    $('#file-options-buttons').hide();
}

function insertFileIntoFolder(fileId) {
    var body = {'id': fileId};
    var access_token = gapi.auth.getToken().access_token;
    var request = gapi.client.request({
        'path': 'https://www.googleapis.com/drive/v2/files/'+window.FOLDER_ID+'/children',
        'method': 'POST',
        'headers': {
            'Authorization': 'Bearer ' + access_token
        },
        'params': {
            'supportsAllDrives': true
        },
        'body':{
            'id': fileId
        }
    });
    request.execute(function(resp) {
        if (resp.error) {
            alert("File Could Not Be Added to Folder!");
        }
    });
}

function updateFileLocation(fileID) {
    var access_token = gapi.auth.getToken().access_token;
    var request = gapi.client.request({
        'path': 'https://www.googleapis.com/drive/v2/files/'+fileID+'?addParents='+window.FOLDER_ID+'?removeParents=root',
        'method': 'PUT',
        'headers': {
            'Authorization': 'Bearer ' + access_token
        },
        'params': {
            'supportsAllDrives': true
        }
    });
    request.execute(function(resp) {
        if (resp.error) {
            alert("File Could Not Be Added to Folder!");
        }
    });
}

function addNewUser(user, perm){
    const promiseAddUser = new Promise((resolve, reject) => {
        $.ajax({
            type: 'POST',
            url: '/addUser',
            data: JSON.stringify({
                username: user,
                permission: perm
            }),
            dataType: "json",
            contentType: "application/json; charset=utf-8",
            success: function(data) {
                console.log(data);
                resolve('success');
            },
            error: function(error) {
                console.log(error);
                reject('error');
            }
        });
    });
    return promiseAddUser;
}

function moveFileToTrash(fileID){
    const promiseTrashFile = new Promise((resolve, reject) => {
        var access_token = gapi.auth.getToken().access_token;
        var request = gapi.client.request({
            'path': 'https://www.googleapis.com/drive/v2/files/'+fileID+'/trash',
            'method': 'POST',
            'headers': {
                'Authorization': 'Bearer ' + access_token
            },
            'params': {
                'supportsAllDrives': true
            }
        });
        request.execute(function(resp) {
            if (!resp.error) {
                console.log("file removed");
                resolve('success');
            }else{
                alert("File Could Not Be Removed!");
                reject('error');
            }
        });
    });
    return promiseTrashFile;
}

function moveUserToTrash(user){
    const promiseTrashUser = new Promise((resolve, reject) => {
        $.ajax({
            type: 'POST',
            url: '/removeUser',
            data: JSON.stringify({
                username: user
            }),
            dataType: "json",
            contentType: "application/json; charset=utf-8",
            success: function(data) {
                console.log(data);
                resolve('success');
            },
            error: function(error) {
                console.log(error);
                reject('error');
            }
        });
    });
    return promiseTrashUser;
}

function moveFolderToTrash(folder){
    const promiseTrashFolder = new Promise((resolve, reject) => {
        if (parentArray.length == 0){
            var query = "trashed=false and mimeType='application/vnd.google-apps.folder' and name='"+folder+"'";
        } else {
            var parent = parentArray[parentArray.length - 1];
            var query = "trashed=false and mimeType='application/vnd.google-apps.folder' and name='"+folder+"' and '"+parent+"' in parents";
        }
        var request = gapi.client.drive.files.list({
            'pageSize': fileNum,
            'q': query,
            'fields': "nextPageToken, files(id)",
            'corpora': 'drive',
            'driveId': SHARED_DRIVE_ID,
            'supportsAllDrives': true,
            'includeItemsFromAllDrives': true
        });
        request.execute(function (resp) {
           if (!resp.error) {
                var folder = resp.result.files[0];
                $.ajax({
                    type: 'POST',
                    url: '/deletePermission',
                    data: JSON.stringify({
                        folder_id: folder.id
                    }),
                    dataType: "json",
                    contentType: "application/json; charset=utf-8",
                    success: async function(data) {
                        console.log(data);
                        await moveFileToTrash(folder.id);
                        resolve('success');
                    },
                    error: function(error) {
                        console.log(error);
                        reject('error');
                    }
                });
           }else{
                alert("Folder Could Not Be Removed!");
                reject('error');
           }
        });
    });
    return promiseTrashFolder;
}

function showLoad(){
    $('.progress').show();
    var xhr = new window.XMLHttpRequest();
    xhr.upload.addEventListener('progress', function(e) {
        if (e.lengthComputable) {
            var percentComplete = ((e.loaded/e.total) - .0001) * 100;
            console.log(percentComplete);
            $('#upload-progress').prop('aria-valuenow', String(percentComplete));
            $('#upload-progress').prop('style', 'width: ' + String(percentComplete) + '%');
            $('#upload-progress').html(String(percentComplete.toFixed(2)) + '%');
        }
    }, false);
    return xhr;
}

function removeLast(arr, n){
    arr.splice(arr.length-n, arr.length);
    return arr;
}

function uploadFile(file, i) {
    return uploadRequest(file).then();
}

function uploadRequest(file) {
    const promise = new Promise((resolve, reject) => {
        if(file.size <= 0){
            file = new Blob([" "], {type: file.type || 'application/octet-stream'});
        }
        if (fileClicked == true){
            clickedFileButton();
        }
        var access_token = gapi.auth.getToken().access_token;
        var reader = new FileReader();
        reader.readAsBinaryString(file);
        reader.onload = function(e) {
            var fileMetadata = {
                'name': file.name,
                'mimeType': file.type || 'application/octet-stream',
                "kind": "drive#file",
                "parents": [window.FOLDER_ID]
            };

            var base64Data = btoa(reader.result);
            var boundary = 'file-upload';
            var delimiter = "\r\n--" + boundary + "\r\n";
            var close_delim = "\r\n--" + boundary + "--";
            var multipartRequestBody =
                delimiter +
                'Content-Type: application/json; \r\n\r\n' +
                JSON.stringify(fileMetadata) +
                delimiter +
                'Content-Type: ' + file.type + '\r\n' +
                'Content-Transfer-Encoding: base64\r\n' +
                '\r\n' +
                base64Data +
                close_delim;

            var request = gapi.client.request({
                   'path': 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
                   'method': 'POST',
                   'headers': {
                        'Content-Type': 'multipart/related; boundary="' + boundary + '"',
                        'Authorization': 'Bearer ' + access_token
                    },
                    'params': {
                        'supportsAllDrives': true
                    },
                   'body': multipartRequestBody
                });
            request.execute(function(resp) {
                   if (!resp.error) {
                        resolve("success");
                   }else{
                        alert("Error: " + resp.error.message);
                        reject("error");
                   }
            });
        }
    });
    return promise;
}

async function fileUploadLoop() {
    files = $('#file-select').prop("files");
    for (let i = 0; i < files.length; i++) {
        var file = files[i];
        console.log(file);
        await uploadFile(file);
    }
    $('#success-message').empty();
    if(files.length == 1){
        showSuccessAndEmpty('file');
    }else{
        showSuccessAndEmpty('files');
    }
}

function checkBlankSearches(){
    var blankSearches = 0;
    $('.search').each(function () {
        if((($(this).val() == '') | ($(this).val() == null))  & !$(this).is(":hidden")) {
            blankSearches++;
        }
    });
    if (blankSearches == 0){
        $('#execute-query').prop('disabled', false);
    }else{
        $('#execute-query').prop('disabled', true);
    }
}

function getAllFolders(search) {
    var query = "trashed=false and mimeType='application/vnd.google-apps.folder'";
    var request = gapi.client.drive.files.list({
        'pageSize': fileNum,
        'q': query,
        'fields': "nextPageToken, files(id, name)",
        'corpora': 'drive',
        'driveId': SHARED_DRIVE_ID,
        'supportsAllDrives': true,
        'includeItemsFromAllDrives': true
    });
    request.execute(async function (resp) {
       if (!resp.error) {
            subFolderArrayPermissions = [];
            var files = resp.result.files;
            var folderList = create2DArray(files.length);
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                await getFolderPermission(file);
                if((userPermission == 'Admin') || (userPermission == 'Public' && subFolderArrayPermissions[i] == 'Public') || (userPermission == 'Team' && subFolderArrayPermissions[i] != 'Admin')){
                    folderList[i][0] = file.id;
                    folderList[i][1] = file.name;
                }
            }
            folderList.sort(function(a, b) {
                if(a[1] > b[1]) return 1;
                if(a[1] < b[1]) return -1;
                return 0;
            });
            for (var i = 0; i < folderList.length; i++) {
                $('#search'+search).append("<option value='"+folderList[i][0]+"'>"+folderList[i][1]+"</option>");
            }
       }
    });
}

function getAllFileTypes(search) {
    var mimeTypeSet;
    var typeDict = {};
    var query = "trashed=false and mimeType!='application/vnd.google-apps.folder'";
    var request = gapi.client.drive.files.list({
        'pageSize': fileNum,
        'q': query,
        'fields': "nextPageToken, files(id, name, mimeType)",
        'corpora': 'drive',
        'driveId': SHARED_DRIVE_ID,
        'supportsAllDrives': true,
        'includeItemsFromAllDrives': true
    });
    request.execute(function (resp) {
       if (!resp.error) {
            var files = resp.result.files;
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                var type = file.name.substr(file.name.lastIndexOf('.')).toLowerCase();
                if(!(type.length > 1 && type.length < 6)){
                    var type = fileType(file.mimeType);
                }
                if(type == 'other'){
                    continue;
                }else{
                    if(typeDict[type] != null){
                        mimeTypeSet = typeDict[type];
                        mimeTypeSet.add(file.mimeType);
                        typeDict[type] = mimeTypeSet;
                    }else{
                        mimeTypeSet = new Set();
                        mimeTypeSet.add(file.mimeType);
                    }
                    mimeTypeSet.add(file.mimeType);
                    typeDict[type] = mimeTypeSet;
                }
            }
            var typeListFinal = create2DArray(Object.keys(typeDict).length);
            var mimeTypeArray;
            var i = 0;
            for (var key in typeDict) {
                mimeTypeSet = typeDict[key];
                mimeTypeArray = Array.from(mimeTypeSet);
                typeListFinal[i][0] = key;
                for (var j = 0; j < mimeTypeArray.length; j++) {
                    typeListFinal[i][j+1] = mimeTypeArray[j];
                }
                i++;
            }
            typeListFinal.sort(function(a, b) {
                if(a[0] > b[0]) return 1;
                if(a[0] < b[0]) return -1;
                return 0;
            });
            for (var i = 0; i < typeListFinal.length; i++) {
                mimeTypeArray = typeListFinal[i];
                mimeTypeArray = mimeTypeArray.slice(1);
                $('#search'+search).append("<option value='"+JSON.stringify(mimeTypeArray)+"'>"+typeListFinal[i][0]+"</option>");
            }
       }
    });
}

function loadUsers(){
    $('#users').empty();
    $('#permissions').empty();
    $('#user-trash').empty();

    $.ajax({
        type: 'POST',
        url: '/getUsers',
        data: JSON.stringify({
            user: 'all'
        }),
        dataType: "json",
        contentType: "application/json; charset=utf-8",
        success: function(data) {
            for (var i = 0; i < Object.keys(data['user']).length; i++) {
                $('#users').append("<div class='user-info' id='username-"+i+"'>"+data['user'][i]+"</div>");
                $('#permissions').append("<div class='user-info' id='permission-"+i+"'>"+data['permission'][i]+"</div>");
                $('#user-trash').append("<input type='checkbox' class='trash-box' id='username-trash-"+i+"' value='"+data['user'][i]+"'>");
            }
        },
        error: function(error) {
            console.log(error);
        }
    });
}

$(document).ready(() => {
    $('#home-button').on('click', () => {
        window.location.href='/';
    });

    $('#library-button').on('click', () => {
        window.location.href='/library';
    });

    $('#notes-button').on('click', () => {
        window.location.href='/notes';
    });

    $('#settings-button').on('click', () => {
        window.location.href='/settings';
    });

    $('#back-button').on('click', () => {
        window.location.href=document.referrer;
    });

    if (top.location.pathname === '/settings'){
        $('#back-button').show();
        $('#settings-button').prop('disabled', true);
        loadUsers();
    }else{
        $('#back-button').hide();
        if(userPermission == 'Admin'){
            $('#settings-button').prop('disabled', false);
        }
    }

    $('#new-user-name').on('input', () => {
        if($('#new-user-permission').val() != null && !$('#trash-users').is(':visible')){
            $('#add-new-user').prop('disabled', false);
        }
    });

    $('#new-user-permission').on('input', () => {
        if($('#new-user-name').val() != '' && !$('#trash-users').is(':visible')){
            $('#add-new-user').prop('disabled', false);
        }
    });

    $('#user-trash').on('change', ':checkbox', () => {
        var checked = document.querySelectorAll('input:checked');
        if (checked.length == 0){
            $('.loadDisable').attr('disabled', false);
            $('#trash-users').hide();
        }else{
            $('.loadDisable').attr('disabled', true);
            $('#trash-users').show();
        }
    });

    $('#trash-users').on('click', () => {
        $('.trash-box').each(async function () {
            if(this.checked) {
                await moveUserToTrash(this.value);
            }
        });
        showSuccessAndUpdateUser('trash');
    });

    $('#add-new-user').on('click', async () => {
        var user = $('#new-user-name').val();
        var permission = $('#new-user-permission').val();
        await addNewUser(user, permission);
        showSuccessAndUpdateUser('add');
    });

    $('#create-folder').on('click', () => {
        $('.close').click();
        $('#folder-form').show();
    });

    $('#upload-file').on('click', () => {
        $('.close').click();
        $('#file-form').show();
    });

    $('.close').on('click', (e) => {
        $('.close').parent().hide();
        $('.input').val("");
        $('#folder-permission-select').val('');
        $('button.input-button').prop('disabled', true);
    });

    $('#file-select').on('input', () => {
        $('#upload').prop('disabled', false);
    });

    $('#folder-name').on('input', () => {
        if($('#folder-permission-select').val() != null){
            $('#add-folder').prop('disabled', false);
        }
    });

    $('#folder-permission-select').on('input', () => {
        if($('#folder-name').val() != ""){
            $('#add-folder').prop('disabled', false);
        }
    });

    $('#search-filter-options').on('input', '.file-search', (e) => {
        if (searchFilters < 5){
            $('#add-search-filter').prop('disabled', false);
            lastInput = e.currentTarget.value;
        } else {
            $('#add-search-filter').prop('disabled', true);
        }
    });

    $('#add-search-filter').on('click', () => {
        if (lastInput == 'Modified Date'){
            $('#search-query').append("<input type='date' id='search"+searchFilters+"' class='search hide'>");
        }else if (lastInput == 'Folder'){
            $('#search-query').append("<select id='search"+searchFilters+"' class='search hide'>");
            $('#search'+searchFilters).append("<option value='' selected disabled hidden></option>");
            getAllFolders(searchFilters);
        }else if (lastInput == 'File Type'){
            $('#search-query').append("<select id='search"+searchFilters+"' class='search hide'>");
            $('#search'+searchFilters).append("<option value='' selected disabled hidden></option>");
            getAllFileTypes(searchFilters);
        }else{
            $('#search-query').append("<input type='text' id='search"+searchFilters+"' class='search hide'>");
        }
        $('#search'+searchFilters).prop('placeholder', lastInput);

        $('#file-search'+searchFilters).attr('disabled', true);
        selectedFilters.push(lastInput);
        $('#search'+searchFilters).css({"display": "block", "margin-top": "5px"});
        $('#search'+searchFilters).show();
        if(searchFilters < 4){
            $('#delete-filter'+searchFilters).remove();
            searchFilters++;
            $('#search-filter-options').append("<div id='search-dropdown"+searchFilters+"' class='search-dropdown additional-filter'></div>");
            $('#search-dropdown'+searchFilters).append("<label class='label' for='file-search"+searchFilters+"'>And </label>");
            $('#file-search0').clone().attr({'id': 'file-search'+searchFilters, 'class': 'file-search child-level'}).appendTo('#search-dropdown'+searchFilters);
            $('#file-search'+searchFilters).attr('disabled', false);
            for (var i = 0; i < selectedFilters.length; i++) {
                $("#file-search"+searchFilters+" option[value='"+selectedFilters[i]+"']").remove();
            }
            $('#search-dropdown'+searchFilters).append("<button class='delete-filter' id='delete-filter"+searchFilters+"' value='search-dropdown"+searchFilters+"'>x</button>");
            $('#add-search-filter').prop('disabled', true);
            checkBlankSearches();
        }else{
             $('#add-search-filter').attr('disabled', true);
        }
    });

    $('#search-filter-options').on('click', '.delete-filter', (e) => {
        $('#add-search-filter').prop('disabled', true);
        var id = e.currentTarget.id;
        var removeId = searchFilters-1;
        if ($('#file-search'+id.charAt(id.length - 1)).prop('disabled') == true){
            removeLast(selectedFilters, 2);
            $('#search'+searchFilters).remove();
            $('#search'+removeId).remove();
        }else{
            selectedFilters.pop();
            $('#search'+removeId).remove();
        }
        searchFilters--;
        checkBlankSearches();
        if(searchFilters > 0){
            $('#search-dropdown'+searchFilters).append("<button class='delete-filter' id='delete-filter"+searchFilters+"' value='search-dropdown"+searchFilters+"'>x</button>");
        } else{
            $('#execute-query').prop('disabled', true);
            selectedFilters = [];
        }
        $('#file-search'+searchFilters).attr('disabled', false);
        $('#file-search'+searchFilters).val('');
        $('#'+e.currentTarget.value).remove();
    });

    $('#search-filter-text').on('input', '.search', () => {
        checkBlankSearches();
    });

    $('#execute-query').on('click', () => {
        var queryArray = create2DArray(5);
        $('#query-results-sql').empty();
        $('#query-results-sql').append("<span class='SQL-select'>SELECT </span>* <span class='SQL-select'>FROM </span><span class='SQL-db'>google.drive </span><br><span class='SQL-select'>&nbsp &nbspWHERE </span>");
        let x = 0;
        let val = 0;
        $('.search').each(function () {
            queryArray[x][0] = selectedFilters[x];
            queryArray[x][1] = $(this).val();
            if(x != 0){
                $('#query-results-sql').append("<span class='SQL-select'> &nbsp &nbspAND </span>");
            }
            if(selectedFilters[x] == 'Folder' | selectedFilters[x] == 'File Type'){
                val = $('#'+ this.id + ' option:selected').text();
            }else{
                val = $(this).val();
            }
            if(selectedFilters[x] == 'Modified Date'){
                $('#query-results-sql').append("<span class='SQL-filter'>" +selectedFilters[x] + "<span/><span class='SQL-select'> > </span>" + "<span class='SQL-value'>" + val + "</span><br>");
            }else if(selectedFilters[x] == 'File Name'){
                $('#query-results-sql').append("<span class='SQL-filter'>" +selectedFilters[x] + "<span/><span class='SQL-select'> LIKE </span>" + "<span class='SQL-value'>" + val + "%</span><br>");
            }else if(selectedFilters[x] == 'File Contents'){
                $('#query-results-sql').append("<span class='SQL-filter'>" +selectedFilters[x] + "<span/><span class='SQL-select'> LIKE </span>" + "<span class='SQL-value'>%" + val + "%</span><br>");
            }else{
                $('#query-results-sql').append("<span class='SQL-filter'>" +selectedFilters[x] + "<span/><span class='SQL-select'> = </span>" + "<span class='SQL-value'>" + val + "</span><br>");
            }
            x++;
        });
        savedQuery = queryArray;
        clickedFolders = ['select', 'root'];
        listFiles(null, null, true, queryArray);
        $('#file-div').show();
    });

    $('#folder-select').on('change', (e) => {
        var val = $('#folder-select').val();
        if (val == 'Search'){
            $('#library-bottom').hide();
            $('.list').empty();
            $('#sub-folder-list').empty();
            $('#sub-folder-trash').empty();
            $('#file-table').append("<h4 id='doc-parent-folder' class='file-header'>Parent Folder</h4>");
            $('#file-table').append("<div id='parent-folder-list' class='list'></div>");
            $('#file-table').append("<div id='move-down-folder' class='list'></div>");
            $('#file-div').hide();
            $('#file-table').css({"margin-left": "0px"});
            $('#execute-query').prop('disabled', true);
            $('#query-results-sql').empty();
            for(var i=0; i<searchFilters+1; i++){
                if(i!=0){
                    $('#search-dropdown'+i).remove();
                    $('#search'+i).remove();
                }
                $('#search'+i).remove();
            }
            selectedFilters = [];
            searchFilters = 0;
            $('#file-search0').prop('disabled', false);
            $('#file-search0').val('');
            $('#search-bottom').show();
            $('#sub-folder-table').hide();
            $('#sub-folder-table').css({"margin-left": "0px"});
            poppedFolders = [00];
            removedFlag = true;
            parentArray = [];
            parentArrayIDs = ['link-root'];
        }else{
            $('#search-bottom').hide();
            removedFlag = true;
            parentArray = [];
            parentArrayIDs = ['link-root'];
            clickedFolders = [];
            poppedFolders = [00];
            currentFolder =  $('#folder-select').val();
            $('.create-buttons').attr('disabled', false);
            if (fileClicked == true){
                clickedFileButton();
            }
            $('#sub-folder-list').empty();
            $('#sub-folder-trash').empty();
            $('.form').hide();
            $('#library-bottom').show();
            $('#doc-parent-folder').remove();
            $('#parent-folder-list').remove();
            $('#move-down-folder').remove();
            $('#file-table').css({"margin-left": "8%"});
            $('#sub-folder-table').css({"margin-left": "8%"});
            $('#file-div').show();
            //Add _ File to 'SubFolder'
            $('#folder-header').html("Add " + val + " Sub-Folder");
            $('#file-header').html("Upload " + val + " File");
            $('#trash-files').hide();
            $('#delete-folder').hide();
            $('#sub-folder-table').show();
            $('h4').show();
            $('#sub-folder-list').append("<button value='/' class='sub-folder-link loadDisable clicked' id='link-root'>/</button>");
            $('#sub-folder-trash').append("<input type='checkbox' class='visibility' id='folder-box-root' value=''>");
            listFiles($('#folder-select').val(), e, true, null);
        }
    });

    $('#add-folder').on('click', () => {
    //check for duplicate subfolders
        if ($('.input').val() == '') {
            alert("Please enter a folder name");
        }else if($('.input').val().indexOf("'") != -1){
            alert("Please enter a valid folder name");
        }else{
            if (fileClicked == true){
                clickedFileButton();
            }
            $('#add-folder').prop('disabled', true);
            $('#close-folder').prop('disabled', true);
            var access_token = gapi.auth.getToken().access_token;
			var request = gapi.client.request({
			   'path': '/drive/v3/files/',
			   'method': 'POST',
			   'headers': {
				   'Content-Type': 'application/json',
				   'Authorization': 'Bearer ' + access_token
			   },
			   'params': {
                    'supportsAllDrives': true
                },
			   'body':{
				   "name" : $('#folder-name').val(),
				   "mimeType" : "application/vnd.google-apps.folder",
				   "kind": "drive#file",
				   "parents": [window.FOLDER_ID]
			   }
			});

			request.execute(function(resp) {
			   if (!resp.error) {
			        $.ajax({
                        type: 'POST',
                        url: '/setPermission',
                        data: JSON.stringify({
                            folder_id: resp.id,
                            permission: $('#folder-permission-select').val(),
                            folder_name: $('#folder-name').val()
                        }),
                        dataType: "json",
                        contentType: "application/json; charset=utf-8",
                        success: function(data) {
                            console.log(data);
                            showSuccessAndEmpty('folder');
                        },
                        error: function(error) {
                            console.log(error);
                        }
                    });
			   }else{
			        alert("Error: " + resp.error.message);
			   }
			});
        }
    });

    $('#upload').on('click', () => {
        $('#upload').prop('disabled', true);
        $('#close-file').prop('disabled', true);
        fileUploadLoop();
    });

    $('#file-list').on('click', '.file', (e) => {
        var fileId = e.currentTarget.value.split('#')[0];
        var access_token = gapi.auth.getToken().access_token;
        var type = e.currentTarget.value.split('#')[1];
        var downloadType = '';
        var request = gapi.client.request({
            'path': 'https://www.googleapis.com/drive/v2/files/'+fileId+'?mimeType='+type+'?alt=media',
            'headers': {
                'Authorization': 'Bearer ' + access_token
            },
            'params': {
                'supportsAllDrives': true,
            }
        });
        $('#file-options-download').prop('disabled', false);
        request.execute(function(resp, respRaw) {
            if (!resp.error) {
                if (resp!=false){
                console.log(resp);
                    if (!resp.webContentLink){
                        addFileButtons(e, resp.embedLink, resp.exportLinks[exportDict[type]], resp.alternateLink);
                        if(!resp.exportLinks[exportDict[type]]){
                             $('#file-options-download').prop('disabled', true);
                        }
                    }else{
                        var hackedDownloadLink = resp.webContentLink.slice(0, 25) + "u/999/" + resp.webContentLink.slice(25);
                        addFileButtons(e, resp.embedLink, hackedDownloadLink, resp.alternateLink);
                    }
                }else{
                    console.log("GetFile Error! Raw resp: "+ JSON.parse(respRaw));
                }
            }else{
                alert("Error: " + resp.error.message);
            }
        });
    });

    $('#file-options-buttons').on('click', '#file-options-preview', (e) => {
        window.open(e.currentTarget.value, '_blank');
        clickedFileButton();
    });

    $('#file-options-buttons').on('click', '#file-options-download', (e) => {
        window.open(e.currentTarget.value, '_blank');
        clickedFileButton();
    });

    $('#file-options-buttons').on('click', '#file-options-edit', (e) => {
        window.open(e.currentTarget.value, '_blank');
        clickedFileButton();
    });

    $('#file-options-buttons').on('click', '#file-options-close', (e) => {
        clickedFileButton();
        fileClicked = false;
    });

    $('#delete-list').on('change', ':checkbox', () => {
        var checked = document.querySelectorAll('input:checked');
        if (checked.length == 0){
            $('.trash-box').addClass('loadDisable');
            $('.loadDisable').attr('disabled', false);
            $('.folder-trash-box').prop('disabled', false);
            $('#trash-files').hide();
        }else{
            $('.trash-box').removeClass('loadDisable');
            $('.loadDisable').attr('disabled', true);
            $('.folder-trash-box').prop('disabled', true);
            $('#trash-files').show();
        }
    });

    $('#sub-folder-trash').on('change', ':checkbox', () => {
        var checked = document.querySelectorAll('input:checked');
        if (checked.length == 0){
            $('.folder-trash-box').addClass('loadDisable');
            $('.loadDisable').attr('disabled', false);
            $('.trash-box').prop('disabled', false);
            $('#delete-folder').hide();
        }else{
            $('.folder-trash-box').removeClass('loadDisable');
            $('.loadDisable').attr('disabled', true);
            $('.trash-box').prop('disabled', true);
            $('#delete-folder').show();
        }
    });

    $('#trash-files').on('click', () => {
        $('.trash-box').each(async function () {
            if(this.checked) {
                await moveFileToTrash(this.value);
            }
        });
        showSuccessAndEmpty('trash');
        $('.folder-trash-box').prop('disabled', true);
    });

    $('#delete-folder').on('click', () => {
        $('.folder-trash-box').each(async function () {
            if(this.checked) {
                await moveFolderToTrash(this.value);
            }
        });
        showSuccessAndEmpty('trash-sub-folder');
    });

    $('#sub-folder-list').on('input', '.subFolder-permission', (e) => {
        $.ajax({
            type: 'POST',
            url: '/updatePermission',
            data: JSON.stringify({
                folder_id: e.currentTarget.id,
                permission: e.currentTarget.value,
                folder_name: $(e.currentTarget).siblings('.sub-folder-link').val()
            }),
            dataType: "json",
            contentType: "application/json; charset=utf-8",
            success: function(data) {
                console.log(data);
            },
            error: function(error) {
                console.log(error);
            }
        });
    });


    $('#sub-folder-list').on('click', '.sub-folder-link', (e) => {
        if($('#folder-select').val() == 'Search'){
            clickedFolders = ['select', 'root'];
            showSubFoldersFlag = false;
        }else{
            showSubFoldersFlag = true;
        }
        var val = e.currentTarget.value;
        var id = e.currentTarget.id;
        currentFolder = val;

        if (fileClicked == true){
            clickedFileButton();
        }

        if(id == 'link-root'){
            $('#folder-select').trigger("change");
            return;
        }

        $('.sub-folder-link').each(function () {
            if($(this).hasClass('clicked')) {
                $(this).removeClass('clicked');
                $(this).siblings('.subFolder-permission').remove();
                $('#folder-box-'+this.id.split('-')[1]).addClass('visibility');
            }
        });

        $(e.currentTarget).addClass('clicked');
        $('#folder-box-'+id.split('-')[1]).removeClass('visibility');

        if (!clickedFolders.includes(id.split('-')[1]) & (!(id.split('-')[1][0] <= clickedFolders[clickedFolders.length-1][0]) | clickedFolders[clickedFolders.length-1][0] == 's')){
            if((!poppedFolders.includes(id.split('-')[1])) & removedFlag & (id.split('-')[1][0] != poppedFolders[poppedFolders.length - 1][0])){
                parentArray.push(window.FOLDER_ID);
            }
            listFiles(val, e, true, null);
            removedFlag = true;
        } else if (!clickedFolders.includes(id.split('-')[1])){
            removeLast(parentArray, parentArray.length - id.split('-')[1][0]);
            var thing = parseInt(id.split('-')[1][0])+1;
            var delArray = parentArrayIDs.splice(parentArrayIDs.indexOf('link-'+thing+'0'), parentArrayIDs.length).filter(x => ((x.split('-')[1][0] > id.split('-')[1][0]) & x != 'link-root'));
            for (var i = 0; i < delArray.length; i++) {
                $('#'+delArray[i]).remove();
                $('#folder-box-'+delArray[i].split('-')[1]).remove();
                index = clickedFolders.indexOf(delArray[i].split('-')[1]);
                if (index != -1) {
                    clickedFolders.splice(index, 1);
                }
            }
            removeLast(clickedFolders, 1);
            poppedFolders = [00];
            listFiles(val, e, showSubFoldersFlag, null);
            removedFlag = true;
        } else {
            removeLast(parentArray, parentArray.length - id.split('-')[1][0]);
            var delArray = parentArrayIDs.splice(parentArrayIDs.indexOf(id)+1, parentArrayIDs.length).filter(x => ((x.split('-')[1][0] > id.split('-')[1][0]) & x != 'link-root'));
            for (var i = 0; i < delArray.length; i++) {
                $('#'+delArray[i]).remove();
                $('#folder-box-'+delArray[i].split('-')[1]).remove();
                index = clickedFolders.indexOf(delArray[i].split('-')[1]);
                if (index != -1) {
                    clickedFolders.splice(index, 1);
                }
            }
            poppedFolders = [00];
            listFiles(val, e, false, null);
            removeLast(clickedFolders, 2);
            removedFlag = false;
        }
    });

});