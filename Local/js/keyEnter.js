(function(){
	var redirectURL = $('.redirectURL').text();
	if(redirectURL === 'undefined') {
		redirectURL = '/';
	}
	console.log("Please enter your key");

	var keySalt;
	var keyData;

	dbQueryInfo(server_addr + '/memberAPI/preflight', {
		}, function(data, textStatus, jQxhr ){
			if(data && data.status === 'ok') {
				keySalt = data.keySalt;	
				keyData = data;
			} else {
				alert("System Error: Please reload this page and try again!");
			}
		}, 'json');	

	$('#enterKey').on('input', function(){
		$('.reEnterHint').addClass('hidden');
	});

	function verifyKeyHash(data, done) {
		if(data.keyHash === keyData.keyHash) {
			done({status:'ok'});
		} else {
			done({status:'error'});
		}
	}

	$('#enterDoneButton').click(function(e) {
		e.preventDefault();
		showV5LoadingIn($('.keyForm'));
		var goldenKey = $('#enterKey').val();

		var expandedKey = forge.pkcs5.pbkdf2(goldenKey, forge.util.decode64(keySalt), 10000, 32);
	
		var md = forge.md.sha256.create();
		md.update(expandedKey);
		var keyHash = md.digest().toHex();
		verifyKeyHash({
				"keyHash": keyHash
			},function(data, textStatus, jQxhr ){
				console.log(data);
				hideV5LoadingIn($('.keyForm'));
				if(data.status === 'ok') {
					data = keyData;
					data.expandedKey = expandedKey;
	
					var salt = forge.random.getBytesSync(128);
					var randomKey = forge.random.getBytesSync(32);
					data.sessionKey = forge.pkcs5.pbkdf2(randomKey, salt, 10000, 32);	
					data.sessionIV = forge.random.getBytesSync(32);
	
					var cipher = forge.cipher.createCipher('AES-CBC', data.sessionKey);
					cipher.start({iv: data.sessionIV});
					cipher.update(forge.util.createBuffer(expandedKey));
					cipher.finish();
					var encrypted = cipher.output;
					var encoded = forge.util.encode64(encrypted.data);
		            
					data.encodedGold =  encoded;
					dbInsertInfo(server_addr + '/memberAPI/preflight', data);
					window.location.href = makeCallNavigate("/teams.ejs");

				} else {
					console.log(data.error);
					$('.reEnterHint').removeClass('hidden');
					$('#enterKey').val('');
				}
			}, 'json'); 
	});
	$('#forgotKey').click(function(e) {
		e.preventDefault();
		$('#forgotKeyModal').modal('toggle');
	});
	
	$('#createANewSite').click(function(e) {
		e.preventDefault();
		//window.location.href = "/createANewSite";
		window.location.href = makeCallNavigate("/createANewSite");
	});
}());
