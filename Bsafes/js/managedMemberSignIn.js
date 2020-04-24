/* global $, window */
function loadPage(){
	'use strict';
	const { ipcRenderer, remote } = require( "electron" );

	var thisDiscovery = localStorage.getItem("encodedGold");

	ipcRenderer.send( "setServerAddr", server_addr );
	// $.get('https://www.openbsafes.com/m/s/demo', function( data ) {
	// 	var $div = $(data);
	// 	var masterId = $div.find('#masterId');
	// 	if (masterId.length > 0) {
	// 		masterId = masterId[0].innerText;
	// 		console.log('masterId', masterId);
	// 		return;
	// 	} else {
	// 		alert('Can not find masterId.');
	// 	}
	// });

	$('#sendBtn').click(function(e) {
		showLoadingInSignIn();
		$('#invalidMember').addClass('hidden');
    	$('#wrongPassword').addClass('hidden');
    	var memberLoginURL = $('#memberLoginURL').val();
    	//var masterId = $('#masterId').text();
		var memberName = forge.util.encodeUtf8($('#memberName').val());
		var password = $('#password').val();

		function getMasterId(done) {

			$.get(memberLoginURL, function( data ) {
				server_addr = "https://" + memberLoginURL.split('https://')[1].split('/')[0];
				ipcRenderer.send( "setServerAddr", server_addr );
	    	var $div = $(data);
				var masterId = $div.find('#masterId');
				var loginUserId = $div.find('.loginUserId');

				if (masterId.length > 0) {
					masterId = masterId[0].innerText;
					console.log('masterId', masterId);
					done(masterId);	
				} else if (loginUserId.length > 0) {
					loginUserId = loginUserId[0].innerText;
					console.log('loginUserId', loginUserId);
					done(loginUserId);	
				} else {
					alert('Can not find masterId and userloginId.');
					return;	
				}
				
				
			})
	    	.fail(function(jqXHR, textStatus, errorThrown){
				showErrorMessage(jqXHR);
			});

		}

    	getMasterId(function(masterId) {
    		var username = 'm' + ':' + masterId + ':' + memberName;
			$.post(server_addr + '/authenticateManagedMember', {
				masterId: masterId,
				username: username,
				password: password
		    }, function(data, textStatus, jQxhr ){
				hideLoadingInSignIn();
		      	if(data.status === 'ok') {
		      		//window.location.href = "/member/";
		      		//navigateView('keyEnter.ejs');
		      		getMasterId( function(loginUserId) {
					
								dbInsertInfo(server_addr + '/memberAPI/getLoginUserId', {status:'ok', loginUserId:loginUserId});
		      			ipcRenderer.send( "setMyGlobalVariable", loginUserId );
		      			navigateView('keyEnter.ejs');
		      		} )
		      		
		      	} else {
					if(data.err === "invalidMember") {
						$('#invalidMember').removeClass('hidden');
					} else if(data.err === "wrongPassword") {
						$('#wrongPassword').removeClass('hidden');
					}
				}
		    }, 'json');

    	})
			
			
	 
    	

		

		return false;

	});
	
};

