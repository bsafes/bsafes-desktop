function loadPage(){
	var memberId = $('.loginUserId').text();

	$("#verifyToken").click(function(event) {
		event.preventDefault();
		var token = $("#token1").val();
		$.post(server_addr + '/verifyMFAToken', {
			token: token 
		}, function(data, textStatus, jQxhr) {
      if(data.status === 'ok') {
				navigateView('keyEnter.ejs');		
			} else {
        alert(data.err);
				$("#token1").val("");
      }
    }, 'json');
	});
}
