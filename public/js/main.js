$(document).ready(function() {

  /**
   * Autocomplete form for Facebook friends. 
   */
  function postfriend(req, res){
    $.ajax({
      type: "POST",
      url: "/api/facebook",
      dataType: "json",
      data: {
        name_startsWith: req.term,
        uid: 
      },
      success: function(data){
        res($.map(data, function(friend){
          return {
            label: friend.name
            id: friend.id
          }
          }).slice(0, 10));
      },
      error: console.log("ajax error")
      });
  };

  function selectfriend(event, ui) {
    $('#friendlist').val(ui.item.label);
    var link = "/" + '' + "/" + ui.item.id;
    window.location.href = link;
  };

  $('#friendlist').autocomplete({
    source: postfriend,
    minLength: 1,
    select: selectfriend});

  });
 });
