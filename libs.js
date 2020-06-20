var server_addr = 'https://www.bsafes.com'
//var server_addr = 'http://localhost:3000'
var forge = require('node-forge');
var ejse = require ("electron").remote.require('ejs-electron');
var BSON = require('bson');
var remote = require ("electron").remote;
var ipcRenderer = require ("electron").ipcRenderer;
var moment = require('moment');

function makeCallNavigate(link)
{
	var href = "javascript:navigateView('" + link + "')";
	//console.log(href);
	return href;
}

function navigateView(goto_view, options)
{
	console.log("Test : " + goto_view);
	// extract Get Params.
	var view_url = goto_view;
	view_url = view_url.split('?');
	view_url.forEach(function(element) {
		element = element.split('=');
		ejse.data(element[0], element[1]);
		console.log(element);
	});

	// var view = goto_view;
	var view = view_url[0];

	const remote = require ("electron").remote;
	//const app = require('electron').remote.app
	const url = require('url');
	const path = require('path');
	//const ejse = require ("electron").remote.require('ejs-electron');

	if ( view.startsWith("/teams/") ) {
		view = 'teams.ejs'
	} else if ( view.startsWith("/team/") ) {
		teamId = view.replace("/team/", "")
		view = 'team.ejs'
	} else if ( view.startsWith("/page/") ) {
		itemId = view.replace("/page/", "")
		view = 'page.ejs'
	} else if ( view.startsWith("/box/") ) {
		itemId = view.replace("/box/", "")
		view = 'box.ejs'
	} else if ( view.startsWith("/notebook/p/") ) {
		itemId = view.replace("/notebook/p/", "")
		view = 'notebookPage.ejs'
	} else if ( view.startsWith("/notebook/") ) {
		itemId = view.replace("/notebook/", "")
		view = 'notebook.ejs'
	} else if ( view.startsWith("/folder/p/") ) {
		itemId = view.replace("/folder/p/", "")
		view = 'folderPage.ejs'
	} else if ( view.startsWith("/folder/") ) {
		itemId = view.replace("/folder/", "")
		view = 'folder.ejs'
	} else if ( view.startsWith("/diary/p/") ) {
		itemId = view.replace("/diary/p/", "")
		view = 'diaryPage.ejs'
	} else if ( view.startsWith("/diary/") ) {
		itemId = view.replace("/diary/", "")
		view = 'diary.ejs'
	} else if ( view.startsWith("/safe/") ) {
		view = 'safe.ejs'
	}

	switch (view) {
		case 'keyEnter.ejs' :
			ejse.data('redirectURL', 'teams.ejs')
			ejse.data('keyHint', options)
			break;
		case 'team.ejs' :
			ejse.data('teamId', teamId)
			break;		
		case 'safe.ejs' :
			ejse.data('teamId', 'u:' + remote.getGlobal('loginUserId'))
			ejse.data('loginUserId', remote.getGlobal('loginUserId'))
			break;
		case 'folder.ejs' :
		case 'box.ejs' :
		case 'notebook.ejs' :
		case 'diary.ejs' :
			ejse.data('initialDisplay', 'contents')
		case 'page.ejs' :
		case 'notebookPage.ejs' :		
		case 'folderPage.ejs' :	
		case 'diaryPage.ejs' :	
			ejse.data('itemId', itemId)			
			break;
		default :
			console.log('edi_error1')
			console.log(view)
			break;
	}

	// set <bsafes_last_url>, <local_last_url>
	if (remote.getGlobal('navigateFolder') == 'bsafes') {
		__dirname = __dirname + '/../../Bsafes/views/';
		localStorage.setItem('bsafes_last_url', goto_view);
	} else if (remote.getGlobal('navigateFolder') == 'local') {
		__dirname = __dirname + '/../../Local/views/';
		localStorage.setItem('local_last_url', goto_view);
	} 
	//console.log('view = ', view);
	const remote_win = remote.getCurrentWindow ();

	remote_win.loadURL(url.format({
	    pathname: path.join(__dirname, view),
	    protocol: 'file:',
	    slashes: true
	}));

	
}

function checkItemType(itemId)
{
  var itemType = itemId.split(':')[0];
  var retType = '';

  switch(itemType) {
  	case 'u': // personal       
      retType = 'personal';
      break;
    case 't1': // team       
      retType = 'team';
      break;
    case 'p':
      retType = 'page';
      break;
    case 'f': // folder
      retType = 'container';
      break;
    case 'b': // box
      retType = 'container';
      break;
    case 'n': // notebook
      retType = 'container';
      break;
    case 'np': // notebook/p/
      retType = 'page';
      break;
    case 'd': // diary
      retType = 'container';
      break;
    case 'dp': // diary/p/
      retType = 'page';
      break;
    default:
      retType = 'skip';
      break;
  }

  return retType;
}

function showErrorMessage(jqXHR)
{
	var msg = '';
	if(jqXHR.status==0) { // internet connection broke  
        msg = 'internet connection broke';
    } else if(jqXHR.status==500) { // internal server error
    	msg = 'internal server error';
    } else if(jqXHR.status==502) { // bad gateway
    	msg = 'Bad Gateway';
    } else {
    	msg = 'unknow error';
    }

    alert(msg);


}
$('.btnBSafes').click(function(e) {
	e.preventDefault();
	ipcRenderer.send( "setNavigateFolder", 'bsafes' );

	var last_url = localStorage.getItem('bsafes_last_url');
	if (last_url) {
		navigateView(last_url);
	} else {
		navigateView('../../BSafes/views/managedMemberSignIn.ejs');
	}
})

$('.btnLocal').click(function(e) {
	e.preventDefault();

	dbQueryInfo(server_addr + '/memberAPI/getLoginUserId', {
	}, function(data, textStatus, jQxhr ){
		if(data && data.status === 'ok'){
			var loginUserId = data.loginUserId;
			ipcRenderer.send( "setMyGlobalVariable", loginUserId );
  		dbQueryInfo(server_addr + '/memberAPI/preflight', {
   			 sessionResetRequired: false
  		}, function(data, textStatus, jQxhr ){
    		if(data && data.status === 'ok'){
      		if(data.keySalt && data.keyHash) {
        		ipcRenderer.send( "setNavigateFolder", 'local' );
  
        		if(!data.encodedGold) {
          		navigateView('../../Local/views/keyEnter.ejs');
        		} else {
          		var last_url = localStorage.getItem('local_last_url');
          		if (last_url) {
            		navigateView(last_url);
          		} else {
            		navigateView('../../Local/views/teams.ejs');
          		}
        		}
      		} else {

      		}
    		}
  		});
		}
	});	
})

$('.btnDownloads').click(function(e) {
	e.preventDefault();
	ipcRenderer.send( "setNavigateFolder", 'download' );
	navigateView('../../Downloads/views/downloads.ejs');
	console.log('downloads');
})

$('.btnTools').off().click(function(e) {	
	e.preventDefault();
	ipcRenderer.send( "toggleThreadView", null );
	console.log('toggled');
	return false;
})

