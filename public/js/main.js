$(document).ready(function() {

  /**
   * Autocomplete form for Facebook friends. 
   */
  function postfriend(req, res){
    $.ajax({
      type: "GET",
      url: "/api/facebook",
      dataType: "json",
      success: function(results){
        var formatted = [];
        for (var i = 0; i < results.friends.length; i++) {
          if (results.friends[i].name.toLowerCase().indexOf($('#friendlist').val().toLowerCase()) >= 0)
           formatted.push({
                            label: results.data[i].name,
                            value: results.data[i].id
           }); 
        }
        res(formatted);

        /*res($.map(results.friends, function(friend){
          return {
            label: friend.name
            id: friend.id
          }
          }).slice(0, 10));*/

      },
      error: console.log("ajax POST error")
      });
  };

  function selectfriend(event, ui) {
    $('#friendlist').val(ui.item.label);
  };

  $('#friendlist').autocomplete({
    source: postfriend,
    minLength: 1,
    select: selectfriend});

 });
