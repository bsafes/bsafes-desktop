(function(){
	var redirectURL = $('.redirectURL').text();
	if(redirectURL === 'undefined') {
		redirectURL = '/';
	}
	console.log("Please enter your key");

	var keySalt;

	$.post(server_addr + '/memberAPI/keyEnterPreflight', {
		}, function(data, textStatus, jQxhr ){
			if(data.status === 'ok') {
				keySalt = data.keySalt;
				localStorage.setItem("keySalt", keySalt);
			} else {
				alert("System Error: Please reload this page and try again!");
			}
		}, 'json');	

	$('#enterKey').on('input', function(){
		$('.reEnterHint').addClass('hidden');
	});

	$('#enterDoneButton').click(function(e) {
		e.preventDefault();
		showV5LoadingIn($('.keyForm'));
		var goldenKey = $('#enterKey').val();

		var expandedKey = forge.pkcs5.pbkdf2(goldenKey, forge.util.decode64(keySalt), 10000, 32);
	
		var md = forge.md.sha256.create();
		md.update(expandedKey);
		var keyHash = md.digest().toHex();
		$.post(server_addr + '/memberAPI/verifyKeyHash', {
				"keyHash": keyHash
			},function(data, textStatus, jQxhr ){
				console.log(data);
				hideV5LoadingIn($('.keyForm'));
				if(data.status === 'ok') {
					var sessionKey = data.sessionKey;
					var sessionIV = data.sessionIV;
	
					var cipher = forge.cipher.createCipher('AES-CBC', sessionKey);
					cipher.start({iv: sessionIV});
					cipher.update(forge.util.createBuffer(expandedKey));
					cipher.finish();
					var encrypted = cipher.output;
					var encoded = forge.util.encode64(encrypted.data);
		            
					localStorage.setItem("encodedGold", encoded);
    		  		localStorage.setItem("publicKey", data.publicKey);
        			localStorage.setItem("encodedPrivateKeyEnvelope", data.privateKeyEnvelope);
          			localStorage.setItem("encodedEnvelopeIV", data.envelopeIV);
					var searchKeyEnvelope = data.searchKeyEnvelope;
					var searchKeyIV = data.searchKeyIV;
	
					function secondFactorAuth() {
						var randomMessage = data.randomMessage;
						randomMessage = forge.util.encode64(randomMessage);
						var privateKey = decryptBinaryString(forge.util.decode64(data.privateKeyEnvelope), expandedKey, forge.util.decode64(data.envelopeIV));
						var pki = forge.pki;
						var privateKeyFromPem = pki.privateKeyFromPem(privateKey);
						var md = forge.md.sha1.create();
						md.update(randomMessage, 'utf8');
						var signature = privateKeyFromPem.sign(md);
						$.post(server_addr + '/memberAPI/secondFactorAuth', {
							signature: signature
						}, function(data , textStatus, jQxr) {
              				if(data.status === 'ok') {
								localStorage.setItem("encodedSearchKeyEnvelope", searchKeyEnvelope);
				                localStorage.setItem("encodedSearchKeyIV", searchKeyIV);
				                //window.location.replace(redirectURL);
				                navigateView(redirectURL);
							}
						}, 'json');
					}

					if(!data.searchKeyEnvelope) {
			          	var salt = forge.random.getBytesSync(128);
			          	var randomKey = forge.random.getBytesSync(32);
			          	var searchKey = forge.pkcs5.pbkdf2(randomKey, salt, 10000, 32);
			          	searchKeyIV = forge.random.getBytesSync(16);
									searchKeyIV = forge.util.encode64(searchKeyIV);
			          	searchKeyEnvelope = encryptBinaryString(searchKey, expandedKey, searchKeyIV);
									searchKeyEnvelope = forge.util.encode64(searchKeyEnvelope);
						secondFactorAuth()
						$.post(server_addr + '/memberAPI/setupSearchKey', {
							searchKeyIV: searchKeyIV,
							searchKeyEnvelope: searchKeyEnvelope
						}, function(data , textStatus, jQxr) {
							if(data.status === 'ok') {
								secondFactorAuth();				
							}
						});	
					} else {
						secondFactorAuth();
					}
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
