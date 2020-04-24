const {app, BrowserWindow, ipcMain, dialog} = require('electron')
const path = require('path')
const url = require('url')
const fs = require('fs')
const ejse = require('ejs-electron')
const appConfig = require("./config");
var sqlite3 = require('sqlite3').verbose();
var BSON = require('bson');
var databaseFile = 'BSafes.db';
var db = null;
var loginUserId;
var arrDownloadQueue = [];
//var threads = require('./thread.js');
var download_folder_path = 'bsafes_downloads/';
//var thread_win;
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;
let thread_win;
var isThreadview = false;

global.server_addr = null;
global.sqliteDB = db;
global.loginUserId = loginUserId;
global.logMesage = [];
global.isDev = false;
global.navigateFolder = 'bsafes';
global.isStopped = false;
global.isSelectDown = false;
global.logModal = '';

function dbInsertInfo(url, data, done)
{ 
  db = global.sqliteDB
  var blobData = BSON.serialize(data);
    
    var sql = "SELECT id FROM info WHERE url = ?";
  db.get(sql, url, function(err, row) {
    if (err) {
      console.log(err, 'dbInsertInfo')
			done(err);
    } else if (row == undefined) {
      db.run("INSERT INTO info (url, jsonData) VALUES (?, ?)", url, blobData);
			done(null);
    } else {
      db.run("UPDATE info SET jsonData = ? WHERE id = ?", blobData, row.id);
			done(null);
    }
  });
}

function dbQueryInfo(url, option, fn)
{
  db = global.sqliteDB;

  var sql =  "SELECT jsonData AS jd FROM info WHERE url = ? ORDER By id DESC LIMIT 0, 1";

  db.get(sql, [url], function(err, row) {
    if (err) {
      console.log(err, 'dbQueryInfo')
    } else if (row == undefined) {
      console.log('no items');
			fn(null);
    } else {
      var blobData = row.jd;
      var data = BSON.deserialize(blobData);

      fn(data);
    }
  });
}

function createWindow () {
  
  // Create the browser window.
  win = new BrowserWindow({
    width: 900, 
    height: 700,
    webPreferences: {
        //nodeIntegration: false,
        preload: path.join(__dirname, 'preload.js')
    }
  })

  //ejse.data('masterId', 'F_hRPgswTh1se8DuWy6762ojHUWOvn6dch4KIvaIo4flg=')
  //ejse.data('displayMasterId', '2339894959580958')

  // and load the index.html of the app.
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'Bsafes/views/managedMemberSignIn.ejs'),
    //pathname: path.join(__dirname, 'Bsafes/views/index.ejs'),
    protocol: 'file:',
    slashes: true
  }))

  win.webContents.executeJavaScript('localStorage.setItem("bsafes_last_url", ""); localStorage.setItem("local_last_url", "");', true)
  .then((result) => {
    //console.log(result);
  })

  if(appConfig.debugEnabled && appConfig.showDevTools){
    win.webContents.openDevTools();
  }

  // clear cache.
  let session = win.webContents.session;
  // session.cookies.get({ url : 'https://www.bsafes.com' }, function(error, cookies) {
  //     console.log(cookies);
  // });
  session.cookies.remove('https://www.bsafes.com', 'connect.sid', function(data) {});

	win.on('close', (event) => {
		event.preventDefault();
		function getPreflightInfo() {
			var server_addr = global.server_addr;
      return new Promise((resolve, reject) => {
				if(server_addr === null) {
					return resolve();
				}
        dbQueryInfo(server_addr + '/memberAPI/preflight', {
          sessionResetRequired: false
        }, function(data) {
          if (data && data.status === 'ok') {
          //  console.log(data);
						data.encodedGold = null;
						data.expandedKey = null;
						data.privateKey = null;
						data.searchKey = null;
						dbInsertInfo(server_addr + '/memberAPI/preflight', data, function(err) {
							if(err) {
								win.destory();
								resolve();
							} else {
								win.webContents.executeJavaScript('localStorage.clear()', true)
  							.then((result) => {
									win.destroy();
                  resolve();
  							});
							}
						});
          } else {
						win.destroy();
            resolve();
          }
        });
      });
    }

		async function beforeClosing() {
  		await getPreflightInfo();
		}
		beforeClosing();

	});
 
  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })

  if (global.isDev) {    
    // Open the DevTools.
    win.webContents.openDevTools();
  } else {
    win.setMenu(null);
    // thread_win.hide();
  }

  createThreadWindow();
}

function createThreadWindow() 
{
  thread_win = new BrowserWindow({ parent: win, show: false })
  thread_win.loadURL(url.format({
    pathname: path.join(__dirname, 'thread.ejs'),
    protocol: 'file:',
    slashes: true
  }))

  thread_win.on('close', function (event) {
    event.preventDefault();
    const dlg_options = {
      type: 'warning' ,
      buttons: ['Ok'],
      defaultId: 2,
      title: 'Warning',
      message: 'Do not close thread view.',
      detail: ''
    };

    dialog.showMessageBox(null, dlg_options, (response, checkboxChecked) => {
    });
  });

  thread_win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    thread_win = null;
  })

  //thread_win.webContents.openDevTools();

  if (isThreadview) {
    thread_win.show();
  } else {
    thread_win.hide();
  }
  
  // thread_win.hide();
}

function initSQLiteDB()
{
  // check whether database file exists...
  let joinedDbFile = path.join(__dirname, databaseFile);
  fs.access(joinedDbFile, fs.F_OK, (err) => {
    if (err) {
      //console.error(err)
      fs.closeSync(fs.openSync(joinedDbFile, 'w'));
      //return;
    }
    //file exists
    db = new sqlite3.Database(joinedDbFile, (err) => {
      if (err) {
        return console.error(err.message);
      }
      console.log('Connected to the BSafes SQlite database.');
    });

    global.sqliteDB = db;

    db.serialize(function() {
      sql = "CREATE TABLE IF NOT EXISTS 'teamList' (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT, jsonData BLOB, total TEXT, downloaded TEXT); ";
      db.run(sql);

      sql = "CREATE TABLE IF NOT EXISTS 'downloadList' (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT, itemId TEXT); ";
      db.run(sql);

      sql = "CREATE TABLE IF NOT EXISTS 'teams' (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT, teamId TEXT, isDownload INTEGER, jsonData BLOB); ";
      db.run(sql);

      sql = "CREATE TABLE IF NOT EXISTS 'containers' (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT, containerId TEXT, isDownload INTEGER, jsonData BLOB); ";
      db.run(sql);

      sql = "CREATE TABLE IF NOT EXISTS 'pages' (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT, pageId TEXT, containerId TEXT, teamId TEXT, " + 
                " counterContentsImages INTEGER DEFAULT -1, downloadedContentsImages INTEGER DEFAULT 0, " + 
                " counterVideos INTEGER DEFAULT -1, downloadedVideos INTEGER DEFAULT 0, " +
                " counterImages INTEGER DEFAULT -1, downloadedImages INTEGER DEFAULT 0, " + 
                " counterOtherTypesContents INTEGER DEFAULT -1, downloadedOtherTypesContents INTEGER DEFAULT 0, " + 
                " counterAttatchments INTEGER DEFAULT -1, downloadedAttatchments INTEGER DEFAULT 0, isDownload INTEGER DEFAULT 0); ";
      db.run(sql);

      sql = "CREATE TABLE IF NOT EXISTS 'pageContents' (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT, pageId TEXT, jsonData BLOB); ";
      db.run(sql);

      sql = "CREATE TABLE IF NOT EXISTS 'pageContentsFiles' (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT, pageId TEXT, s3Key TEXT, file_name TEXT); ";
      db.run(sql);

      sql = "CREATE TABLE IF NOT EXISTS 'pageVideos' (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT, pageId TEXT, s3Key TEXT, file_name TEXT, jsonData BLOB); ";
      db.run(sql);

      sql = "CREATE TABLE IF NOT EXISTS 'pageAttatchments' (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT, pageId TEXT, chunkIndex TEXT, s3KeyPrefix TEXT, file_name TEXT, jsonData BLOB); ";
      db.run(sql);

      sql = "CREATE TABLE IF NOT EXISTS 'pageImages' (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT, pageId TEXT, s3Key TEXT, file_name TEXT, jsonData BLOB); ";
      db.run(sql);

      sql = "CREATE TABLE IF NOT EXISTS 'pageOtherTypesContentFiles' (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT, pageId TEXT, s3Key TEXT, file_name TEXT); ";
      db.run(sql);

      sql = "CREATE TABLE IF NOT EXISTS 'itemPath' (" +
              "id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT, itemId TEXT, jsonData BLOB); ";
      db.run(sql);

      sql = "CREATE TABLE IF NOT EXISTS 'logs' (" +
              "id INTEGER PRIMARY KEY AUTOINCREMENT, itemName TEXT, itemID TEXT, position TEXT, status TEXT, total TEXT, downloaded TEXT, logTime TEXT); ";
      db.run(sql);

      sql = "CREATE TABLE IF NOT EXISTS 'info' (" +
              "id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT, jsonData BLOB); ";
      db.run(sql);

      sql = "UPDATE pages SET isDownload = -1 WHERE isDownload = 0";
      db.run(sql);      
      
    });

  })  
  
}

function initApp()
{
  let joinedPath = path.join(__dirname, download_folder_path);
  if (!fs.existsSync(joinedPath)){
    fs.mkdirSync(joinedPath);
  }

  initSQLiteDB();
}

initApp();

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
//   if (process.platform !== 'darwin') {
    app.quit()
    //db.close();
//   }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

ipcMain.on('show-message', (event, msg) => {
    if (win) {
        win.webContents.send('show-message', msg);
    }
})

ipcMain.on( "setMyGlobalVariable", ( event, myGlobalVariableValue ) => {
  global.loginUserId = myGlobalVariableValue;
} );

ipcMain.on( "setServerAddr", ( event, serverAddr ) => {
  global.server_addr = serverAddr;
} );

ipcMain.on( "setDownloadStatus", ( event, isStopped ) => {
  global.isStopped = isStopped;  
} );

ipcMain.on( "saveLogModal", ( event, modal ) => {
  global.logModal = modal;
} );

ipcMain.on( "sendDownloadMessage", ( event, message ) => {
  global.logMesage.push(message);  
} );

ipcMain.on( "sliceDownloadLogs", ( event, index ) => {
  var tmp_log = global.logMesage;
  global.logMesage = tmp_log.slice(index);
} );

ipcMain.on( "setNavigateFolder", ( event, myGlobalVariableValue ) => {
  global.navigateFolder = myGlobalVariableValue;
} );

ipcMain.on( "showDialong", ( event, msg ) => {
	const dlg_options = {
	  type: msg.type ,
	  buttons: ['Ok'],
	  defaultId: 2,
	  title: msg.type.toUpperCase(),
	  message: msg.msg,
	  detail: '',
	};

	dialog.showMessageBox(null, dlg_options, (response, checkboxChecked) => {
	});
  
} );

ipcMain.on( "toggleThreadView", ( event, myGlobalVariableValue ) => {
  if (thread_win) {
    isThreadview = !isThreadview;
    if (isThreadview) {
      thread_win.show();
    } else {
      thread_win.hide();
    }  
  } else {
    // const dlg_options = {
    //   type: 'error' ,
    //   buttons: ['Ok'],
    //   defaultId: 2,
    //   title: 'Error',
    //   message: 'Ooh, Thread view was destroyed. Please run again.',
    //   detail: '',
    // };

    // dialog.showMessageBox(null, dlg_options, (response, checkboxChecked) => {
    // });
    isThreadview = true;
    createThreadWindow();
  }
  
  // console.log('isThreadview = ', isThreadview);
});

ipcMain.on( "selectDownload", ( event, myGlobalVariableValue ) => {
  global.isSelectDown = myGlobalVariableValue;
});
