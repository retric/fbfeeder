$(function() {

  $('#friendlist').autocomplete({
    source: function (req, res) {
     $.ajax( {
        type: "POST",
        url: "/friendlist",
        dataType: "json",
        data: {
          name_startsWith: req.term,
          uid: userid
        },
        success: function(data) {
          res($.map(data, function (friend) {
            return {
              label: friend.name,
              id: friend.id
            }
          }).slice(0, 10)); 
        },
        error: function() {
          console.log("ajax error");
        }
      });
    },
    minLength: 1,
    select: function(event, ui) {
    $('#friendlist').val(ui.item.label);
    var link = "/" + '<%= user.username %>' + "/" + ui.item.id;
    window.location.href = link;
    } 
  });

});
