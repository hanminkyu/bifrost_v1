const _DT_MIN = 18
const _DT_MAX = 50
var prevServerCoordinates = new Set();
var svrTempChart;

/** 2019.05.18 Customized setInterval function to execute the function before set setInterval action */
function executeSetInterval(func, delay){
  func();
  setInterval(func,delay);
}
/** 2019.05.27 Added function calculates a rgb value corresponding to value middle in the min and max values */
/** 2019.05.27 Added function calculates a rgb value corresponding to value middle in the min and max values */
function calculateRgb(downtime, min, max){
  var color = [[255, 0, 0], [255, 88, 56], [255, 153, 38], [255, 185, 29], [255, 225, 32],
  [210, 217, 54], [149, 209, 75], [81, 203, 97], [11, 176, 106], [9, 155, 90]];
  var gap = (max - min) / 8;
  var rtnColor;

  switch (true) {
    case (downtime <= min):
      rtnColor = color[0];
      break;
    case (downtime >= min + gap * 8):
      rtnColor = color[9];
      break;
    case (downtime > min + gap * 7):
      rtnColor = color[8];
      break;
    case (downtime > min + gap * 6):
      rtnColor = color[7];
      break;
    case (downtime > min + gap * 5):
      rtnColor = color[6];
      break;
    case (downtime > min + gap * 4):
      rtnColor = color[5];
      break;
    case (downtime > min + gap * 3):
      rtnColor = color[4];
      break;
    case (downtime > min + gap * 2):
      rtnColor = color[3];
      break;
    case (downtime > min + gap * 1):
      rtnColor = color[2];
      break;
    case (downtime > min):
      rtnColor = color[1];
      break;
    default:
      rtnColor = [145,145,145];
      break;
  }

  return rtnColor;
}

function ajaxUpdateLineChartbyUrl(url){
  var tempType = $("#selectedTempType").html();
  var options = {
    responsive: true,
    maintainAspectRatio: false,
    spanGaps: false,
    title:{
      display:true,
      text: '온도 그래프',
      fontColor: "#eeeeee"
    },
    tooltips: {
      mode: "index",
      intersect: false,
    },
    legend: {
      labels: {
        fontColor: "#eeeeee"
      }
    },
    elements: {
      line: {
        tension: 0.000001
      }
    },
    plugins: {
      filler: {
        propagate: false
      }
    },
    scales: {
      xAxes: [{
        type: 'time',
        distribution: 'series',
        display: true,
        scaleLabel: {
          display: true,
          labelString: '시간',
          fontColor: "#eeeeee"
        },
        ticks: {
          source: 'data',
          autoSkip: true,
          fontColor: "#eeeeee"
        }
      }],
      yAxes: [{
        display: true,
        scaleLabel: {
          display: true,
          labelString: '온도',
          fontColor: "#eeeeee"
        },
        ticks: {
          fontColor: "#eeeeee",
          callback: function(value){
            if (value%1 == 0) return value;
          }          
        }
      }]
    }
  };

  $.ajax({
    url: url,
    type: "GET"
  })
  .done(function(data){
    var json = JSON.parse(data);
    var data = {
      timestamp: [],
      temp: [],
      ratio: [],
      downtime: [],
      e: []
    };
    var field;

    if(tempType == "CPU"){ field = "cpu" }
    else if(tempType == "Ambient"){ field = "amb"; }
    for (var key in json.result[field]) {
      // data.timestamp.push(key);
      // data.temp.push(json.result[field][key].value);
      // data.ratio.push(json.result[field][key].ratio);
      data.e.push({
        x: key,
        y: json.result[field][key].value
      });
      // data.downtime.push(json.result[field][key].downtime);
    }

    var dataset = {
      label: tempType,
      fill: false,
      backgroundColor: "#00c292",
      borderColor: "#00c292",
      data: data.e,
      type: 'line',
      pointRadius: 0,
      lineTension: 0,
      borderWidth: 2
    }

    if(svrTempChart == undefined){
      svrTempChart = new Chart(document.getElementById("chartServerInfoTemp"),{
        type: 'bar',
        data: {
          datasets: [dataset]
        },
        options: options
      });
    }
    else{
      svrTempChart.data.datasets.pop();
      svrTempChart.data.datasets.push(dataset)
      svrTempChart.update();
    }

  });
}

function ajaxUpdateServerInfo(serverId){
  $("#detailsServerIdVal").attr("val",serverId);
  ajaxGetSvrInfobyUrl("/api/v1/servers/"+$("#detailsServerIdVal").attr("val"));
  ajaxUpdateLineChartbyUrl("/api/v1/servers/"+$("#detailsServerIdVal").attr("val")+"/stat");
}

function ajaxUpdateHoles(url){
  $.ajax({
    url: url,
    type: "GET"
  })
  .done(function(data){
    var json = JSON.parse(data);
    var rackServer = json.result.rackServer;
    var serverId = json.result.serverId;
    var rackId = json.result.rackId;
    var rackName = json.result.rackName;
    var serverHole = json.result.serverHole;
    var serverBay = json.result.serverBay;
    var tempMax = [];
    var downtime = [];
    var ratioMax = [];
    var sorter = {};
    var duplicated = {};
    var classHelper = 0;

    /** Selected Temperature Type Check */
    if($("#selectedTempType").html() == "CPU"){
      downtime = json.result.downtimeCpu;
      tempMax = json.result.cpuTempMax;
      ratioMax = json.result.cpuRatioMax;
    }
    else if($("#selectedTempType").html() == "Ambient"){
      downtime = json.result.downtimeAmb;
      tempMax = json.result.ambTempMax;
      ratioMax = json.result.ambRatioMax;
    }
    else if($("#selectedTempType").html() == "All"){
      for(var key in serverId){
        if(json.result.downtimeCpu[key] < json.result.downtimeAmb[key]){
          downtime.push(json.result.downtimeCpu[key]);
          tempMax.push(json.result.cpuTempMax[key]);
          ratioMax.push(json.result.cpuRatioMax[key]);
        }
        else{
          downtime.push(json.result.downtimeAmb[key]);
          tempMax.push(json.result.ambTempMax[key]);
          ratioMax.push(json.result.ambRatioMax[key]);
        }
      }
    }

    /** clean old ones */
    for(var i=1; i<=42; i++){
      $("#hole"+i).removeClass("cursor-pointer details-rack-td-0 details-rack-td-1"+
       " skt-details-hole-border-bottom skt-details-hole-border-top");
      $("#hole"+i).html("&nbsp");
      $("#hole"+i).css("background","rgba(60,60,60,0.4)");
      $("#hole"+i).unbind("click");
      $("#hole"+i).parent().find(".details-rack-t").html("&nbsp");
      $("#hole"+i).parent().find(".details-rack-r").html("&nbsp");
      $("#hole"+i).parent().find(".details-rack-dt").html("&nbsp");
      $("#hole"+i).attr("data-toggle","");
      $("#hole"+i).attr("data-target","");
      /** error handling - prevent eliminating a modal when user is keeping his eyes on it. */
      if(!$("body").hasClass("modal-open")) $(".rack-image-area").find(".modal").remove();
    }

    /** for Hole sorting, we are using json variable*/
    for(var i = 0; i < serverHole.length; i++){
      sorter[serverHole[i]]=i;
      if(duplicated[serverHole[i]] == undefined) duplicated[serverHole[i]] = [i];
      else duplicated[serverHole[i]].push(i);
    }

    //sorter[key] means the index of current order in serverHole array
    for(var key in sorter){
      var start = serverHole[sorter[key]][0];
      var end = serverHole[sorter[key]][1];
      //var statusClass = "";
      /** Downtime threshold applied */
      var color, fontColor;
      if(downtime[sorter[key]] == null || tempMax[sorter[key]] == null){
        color = [60,60,60];
        fontColor = "#cccccc";
      }
      else{
        color = calculateRgb(downtime[sorter[key]],_DT_MIN, _DT_MAX);
        fontColor = "#333333";
      }

      for(var i=start;i<=end;i++){
        $("#hole"+i).addClass("cursor-pointer details-rack-td-"+classHelper%2);
        $("#hole"+i).css("background", "rgba("+color[0]+","+color[1]+","+color[2]+")");
        $("#hole"+i).css("color", fontColor);
        $("#hole"+i).attr("data-serverId", serverId[sorter[key]]);
        $("#hole"+i).click(function(){
          ajaxUpdateServerInfo($("#"+event.target.id).attr("data-serverId"));
        });
      }
      $("#hole"+start).addClass("skt-details-hole-border-bottom");
      $("#hole"+end).addClass("skt-details-hole-border-top");
      $("#hole"+parseInt((start+end)/2)).html(rackServer[sorter[key]]);
      var t = tempMax[sorter[key]] != undefined? tempMax[sorter[key]] : "NA";
      var r = ratioMax[sorter[key]] != undefined? ratioMax[sorter[key]] : "NA";
      var dt = downtime[sorter[key]] != undefined? downtime[sorter[key]] : "NA";
      $("#hole"+parseInt((start+end)/2)).parent().find(".details-rack-t").html(t);
      $("#hole"+parseInt((start+end)/2)).parent().find(".details-rack-r").html(r);
      $("#hole"+parseInt((start+end)/2)).parent().find(".details-rack-dt").html(dt);
      classHelper++;
    }

    /** Handling BL Type servers */
    for(var key in duplicated){
      if(duplicated[key].length > 1){
        var start = parseInt(key.split(",")[0]);
        var end = parseInt(key.split(",")[1]);

        /** Init the hole figures and events */
        for(var i=start;i<=end;i++){
          $("#hole"+i).removeClass("cursor-pointer details-rack-td-0 details-rack-td-1"+
          " skt-details-hole-border-bottom skt-details-hole-border-top");
          $("#hole"+i).html("&nbsp");
          $("#hole"+i).css("background","rgba(60,60,60,0.4)");
          $("#hole"+i).unbind("click");
          $("#hole"+i).parent().find(".details-rack-t").html("&nbsp");
          $("#hole"+i).parent().find(".details-rack-r").html("&nbsp");
          $("#hole"+i).parent().find(".details-rack-dt").html("&nbsp");
        }
        var min_dt_index=undefined;
        /** Find representative value */
        for(var i=0; i<duplicated[key].length; i++){
          if(min_dt_index == undefined || downtime[min_dt_index] == null || (downtime[duplicated[key][i]] != null && 
            downtime[duplicated[key][i]] < downtime[min_dt_index])) min_dt_index = duplicated[key][i];
        }
        var color, fontColor;
        if(downtime[min_dt_index] == null || tempMax[min_dt_index] == null){
          color = [60,60,60];
          fontColor = "#cccccc";
        }
        else{
          color = calculateRgb(downtime[min_dt_index],_DT_MIN, _DT_MAX);
          fontColor = "#333333";
        }

        /** Apply representative value to hole figures */
        for(var i=start;i<=end;i++){
          $("#hole"+i).addClass("cursor-pointer details-rack-td-0");
          $("#hole"+i).css("background", "rgba("+color[0]+","+color[1]+","+color[2]+")");
          $("#hole"+i).css("color", fontColor);
          $("#hole"+i).attr("data-serverId", serverId[min_dt_index]);
          $("#hole"+i).attr("data-toggle","modal");
          $("#hole"+i).attr("data-target","#bl-modal-"+serverId[min_dt_index]);
          $("#hole"+i).click(function(){
            ajaxUpdateServerInfo($("#"+event.target.id).attr("data-serverId"));
          });
        }
        $("#hole"+start).addClass("skt-details-hole-border-bottom");
        $("#hole"+end).addClass("skt-details-hole-border-top");
        $("#hole"+parseInt((start+end)/2)).html("(BL) "+rackServer[min_dt_index]);
        var t = tempMax[min_dt_index] != undefined? tempMax[min_dt_index] : "NA";
        var r = ratioMax[min_dt_index] != undefined? ratioMax[min_dt_index] : "NA";
        var dt = downtime[min_dt_index] != undefined? downtime[min_dt_index] : "NA";
        $("#hole"+parseInt((start+end)/2)).parent().find(".details-rack-t").html(t);
        $("#hole"+parseInt((start+end)/2)).parent().find(".details-rack-r").html(r);
        $("#hole"+parseInt((start+end)/2)).parent().find(".details-rack-dt").html(dt);

        /** Add modal to pop up the BL type components */
        if(!$("body").hasClass("modal-open")){
          var modalHtml = ''+
          '<div class="modal fade" id="bl-modal-'+serverId[min_dt_index]+'" role="dialog" style="display:none;">'+
          '<div class="modal-dialog modals-default modal-bl-info">'+
            '<div class="modal-content">'+
              '<div class="modal-header">'+
                '<button class="close" type="button" data-dismiss="modal">&times</button>'+
              '</div>'+
              '<div class="modal-body">'+
                '<h1 class="modal-title">BL Type 상세 정보</h1>'+
                '<p class="modal-sub-title"> </p>'+
                '<div class="row">'+
                  '<div class="skt-smr-modal-tbl">'+
                    '<div class="col-lg-1 col-md-1 col-sm-3 col-xs-3 skt-modal-bay-container">'+
                      '<p class="skt-smr-modal-txt skt-smr-modal-tbl-hd">Bay</p>'+
                    '</div>'+
                    '<div class="col-lg-1 col-md-1 col-sm-3 col-xs-3 skt-modal-temp-container">'+
                      '<p class="skt-smr-modal-txt skt-smr-modal-tbl-hd">T</p>'+
                    '</div>'+
                    '<div class="col-lg-1 col-md-1 col-sm-3 col-xs-3 skt-modal-ratio-container">'+
                      '<p class="skt-smr-modal-txt skt-smr-modal-tbl-hd">R</p>'+
                    '</div>'+
                    '<div class="col-lg-1 col-md-1 col-sm-3 col-xs-3 skt-modal-dt-container">'+
                      '<p class="skt-smr-modal-txt skt-smr-modal-tbl-hd">RT</p>'+
                    '</div>'+
                    '<div class="col-lg-8 col-md-8 col-sm-12 col-xs-12 skt-modal-name-container">'+
                      '<p class="skt-smr-modal-txt skt-smr-modal-tbl-hd">Server Name</p>'+
                    '</div>'+
                  '</div>'+
                '</div>'+
              '</div>'+
              '<div class="modal-footer"></div>'+
            '</div>'+
          '</div>'+
          '</div>';
          $(".rack-image-area").append(modalHtml);
        }
        else{
          $("#bl-modal-"+serverId[min_dt_index]).find(".skt-modal-bay-container").empty()
          .append('<p class="skt-smr-modal-txt skt-smr-modal-tbl-hd">Bay</p>');
          $("#bl-modal-"+serverId[min_dt_index]).find(".skt-modal-temp-container").empty()
          .append('<p class="skt-smr-modal-txt skt-smr-modal-tbl-hd">T</p>');
          $("#bl-modal-"+serverId[min_dt_index]).find(".skt-modal-ratio-container").empty()
          .append('<p class="skt-smr-modal-txt skt-smr-modal-tbl-hd">R</p>');
          $("#bl-modal-"+serverId[min_dt_index]).find(".skt-modal-dt-container").empty()
          .append('<p class="skt-smr-modal-txt skt-smr-modal-tbl-hd">DT</p>');
          $("#bl-modal-"+serverId[min_dt_index]).find(".skt-modal-name-container").empty()
          .append('<p class="skt-smr-modal-txt skt-smr-modal-tbl-hd">Server Name</p>');
        }
        for(var i in duplicated[key]){
          $("#bl-modal-"+serverId[min_dt_index]).find(".skt-modal-bay-container")
          .append("<p class='skt-smr-modal-txt'>"+serverBay[duplicated[key][i]]+"</p>");
          $("#bl-modal-"+serverId[min_dt_index]).find(".skt-modal-temp-container")
          .append("<p class='skt-smr-modal-txt'>"+tempMax[duplicated[key][i]]+"</p>");
          $("#bl-modal-"+serverId[min_dt_index]).find(".skt-modal-ratio-container")
          .append("<p class='skt-smr-modal-txt'>"+ratioMax[duplicated[key][i]]+"</p>");
          $("#bl-modal-"+serverId[min_dt_index]).find(".skt-modal-dt-container")
          .append("<p class='skt-smr-modal-txt'>"+downtime[duplicated[key][i]]+"</p>");
          $("#bl-modal-"+serverId[min_dt_index]).find(".skt-modal-name-container")
          .append("<p class='skt-smr-modal-txt cursor-pointer' onclick='ajaxUpdateServerInfo("+serverId[duplicated[key][i]]+
          ")'>"+rackServer[duplicated[key][i]]+"</p>");
        }
        $("#bl-modal-"+serverId[min_dt_index]);
      }
    }

    /** Rack Name Info. change */
    $("#detailsViewRackName").html(rackName);
  });
}

/** 2019.05.18 AJAX function updates grid map -JJ- */
function ajaxUpdateMap(url){
  $.ajax({
    url: url,
    type: "GET"
  })
  .done(function(data){
    var json = JSON.parse(data);
    var coordinates = json.result.coordinates;
    var rackName = json.result.rackName;
    var rackServer = json.result.rackServer;
    var rackId = json.result.rackId;
    var cpuTempMax = json.result.cpuTempMax;
    var ambTempMax = json.result.ambTempMax;
    var downtimeCpu = json.result.downtimeCpu;
    var downtimeAmb = json.result.downtimeAmb;
    var downtime = [];
    var tempMax = [];
    var tempSet = new Set();

    /** Grid map will refer the downtime data */
    if($("#selectedTempType").html() =="CPU"){ downtime=downtimeCpu; tempMax=cpuTempMax; }
    else if($("#selectedTempType").html() =="Ambient"){ downtime=downtimeAmb; tempMax=ambTempMax; }
    else if($("#selectedTempType").html() =="All"){
      for(var key in rackId){
        if(downtimeAmb[key] == null){
          downtime.push(downtimeCpu[key]);
          tempMax.push(cpuTempMax[key]);
        }
        else if(downtimeCpu[key] == null){
          downtime.push(downtimeAmb[key]);
          tempMax.push(ambTempMax[key]);
        }
        else if(downtimeAmb[key]<downtimeCpu[key]){
          downtime.push(downtimeAmb[key]);
          tempMax.push(ambTempMax[key]);
        }
        else{
          downtime.push(downtimeCpu[key]);
          tempMax.push(cpuTempMax[key]);
        }
      }
    }

    $(".skt-details-td").removeClass("clickable-details-rack");

    for(var i=0; i<coordinates.length; i++){
      for(var key in coordinates[i]){
        var addClass;

        /** 2019.05.27 html -JJ- */
        if(key == 0){ $("#"+coordinates[i][key]).html(tempMax[i]); addClass = "skt-details-td-temp"; }
        else if(key == 1){ $("#"+coordinates[i][key]).html(downtime[i]); addClass = "skt-details-td-dt"; }

        /** 2019.05.28 check if there are some missed values -JJ- */
        if(prevServerCoordinates.has(coordinates[i][key])) prevServerCoordinates.delete(coordinates[i][key]);
        tempSet.add(coordinates[i][key]);

        /** 2019.05.27 color viaration -JJ- */
        var color = [];
        if(downtime[i] != null) color = calculateRgb(downtime[i], _DT_MIN, _DT_MAX);
        else color = [60,60,60];
        $("#"+coordinates[i][key]).css("background", "rgba("+color[0]+","+color[1]+","+color[2]+",0.9)");

        /** 2019.05.19 Add data-rackname to activate on click event -JJ- */
        $("#"+coordinates[i][key]).data("rackId", rackId[i]);
        $("#"+coordinates[i][key]).attr("data-rackId", rackId[i]);
        $("#"+coordinates[i][key]).addClass("clickable-details-rack cursor-pointer " + addClass);

      }
    }
    
    /** color grey for the elements in the set, prevServerCoordinates */
    prevServerCoordinates.forEach(function(e){
      $("#"+e).css("background", "rgba(228,228,228,0.9)");
    });
    prevServerCoordinates = tempSet;

  });
}

/** 2019.05.21 AJAX function updates Map background -JJ- */
function ajaxUpdateGridBackground(url){
  $.ajax({
    url: url,
    type: "GET"
  })
  .done(function(data){
    var json = JSON.parse(data);
    var result_backprop = json.result[0]
    var result_equip = json.result[1]
    var coordinates = result_backprop.coordinates;
    var type = result_backprop.type;
    var value = result_backprop.value;
    var coordinates_equip = result_equip.coordinates;
    var rackServer = result_equip.rackServer;
    var rackid_equip = result_equip.rackid;
    var image_equip = result_equip.image;

    /** Backprop Drawing & Painting */
    for(var key in coordinates){
      var addClass = "";

      $("#"+coordinates[key]).removeClass("grid-td-border-top grid-td-border-right grid-td-border-bottom grid-td-border-left "+
      "grid-td-rack-top grid-td-rack-right grid-td-rack-bottom grid-td-rack-left ");
      if(type[key] == "border"){
        var isTop = value[key]&1;
        var isRight = value[key]>>1&1;
        var isBottom = value[key]>>2&1;
        var isLeft = value[key]>>3&1;

        if(isTop) addClass = addClass + "grid-td-border-top ";
        if(isRight) addClass = addClass + "grid-td-border-right ";
        if(isBottom) addClass = addClass + "grid-td-border-bottom ";
        if(isLeft) addClass = addClass + "grid-td-border-left ";
      }
      else if(type[key] == "color"){
        if(value[key] == "grey"){

        }
      }
      else if(type[key] == "rack"){
        var isTop = value[key]&1;
        var isRight = value[key]>>1&1;
        var isBottom = value[key]>>2&1;
        var isLeft = value[key]>>3&1;
        addClass = "grid-td-rack ";
        if(isTop) addClass = addClass + "grid-td-rack-top ";
        if(isRight) addClass = addClass + "grid-td-rack-right ";
        if(isBottom) addClass = addClass + "grid-td-rack-bottom ";
        if(isLeft) addClass = addClass + "grid-td-rack-left ";
        $("#"+coordinates[key]).html("000");
      }

      /** 2019.05.29 "dev", "wind" are added by Changgyu */
      else if(type[key] == "dev"){
        if(value[key] == 0)   // 0 == cooler
          $("#"+coordinates[key]).css("background", "rgba(0, 128, 255,0.9)");
      }
      else if(type[key] == "wind"){
        var windHtml = "";
        if(value[key] == 0) {
          windHtml = "<span style='color:#0080ff'>▲</span>";
        }
        else if(value[key] == 1) {
          windHtml = "<span style='color:#0080ff'>▶</span>";
        }
        else if(value[key] == 2) {
          windHtml = "<span style='color:#0080ff'>▼</span>";
        }
        else if(value[key] == 3) {
          windHtml = "<span style='color:#0080ff'>◀</span>";
        }
        $("#"+coordinates[key]).html(windHtml);
      }
      else if(type[key] == "text"){
        $("#"+coordinates[key]).html("<span style='color:#ffffff'>" + value[key] + "</span>")
      }

      $("#"+coordinates[key]).addClass(addClass);
    }

    /** Equip Drawing & Painting */
    for(var key in coordinates_equip){
      var addClass = "";
      var html = {
        "SWITCH&ROUTER": ["&nbsp&nbspS&nbsp&nbsp", "&nbsp&nbspR&nbsp&nbsp"],
        "SERVER": ["&nbsp&nbspE&nbsp&nbsp", "&nbsp&nbspQ&nbsp&nbsp"]
      };
      
      if(image_equip[key] == "SWITCH&ROUTER"){
        addClass = addClass + "grid-td-sr ";
      }
      else if(image_equip[key] == "SERVER"){
        addClass = addClass + "grid-td-server ";
      }

      for(var i in coordinates_equip[key]){
        $("#"+coordinates_equip[key][i]).addClass(addClass);
        $("#"+coordinates_equip[key][i]).html(html[image_equip[key]][i]);

        /** 2019.05.19 Add data-rackname to activate on click event -JJ- */
        $("#"+coordinates_equip[key][i]).data("rackId", rackid_equip[key]);
        $("#"+coordinates_equip[key][i]).attr("data-rackId", rackid_equip[key]);
        $("#"+coordinates_equip[key][i]).addClass("clickable-details-rack cursor-pointer " + addClass);

        /** 2019.05.19 Add tooltip contains the server names in the rack -JJ- */
        var tooltipTxt = "";
        rackServer[key].forEach(function(e){tooltipTxt = tooltipTxt + e + "<br>"});
        $("#"+coordinates_equip[key][i]).attr("data-original-title", tooltipTxt);
      }
    }

    /** Clear old on-click event -JJ- */
    $(".clickable-details-rack").unbind("click");
    /** Add on-click event to grid elements -JJ- */
    $(".clickable-details-rack").click(function(){
      $("#detailsRackIdVal").attr("val", $("#"+event.target.id).attr("data-rackId"));
      ajaxUpdateHoles("/api/v1/racks/"+$("#detailsRackIdVal").attr("val"));
    });

  });
}

function ajaxGetSvrInfobyUrl(url){
  $.ajax({
    url: url,
    type: "GET"
  })
  .done(function(data){
    var json = JSON.parse(data);
    $("#detailsViewServerName").html(json.result.serverName[0]);
    $("#dtlInfoWhoInChargeMain").val(json.result.memo.c_main);
    $("#dtlInfoWhoInchargeSub").val(json.result.memo.c_sub);
    $("#dtlInfoMemoLastModified").html(json.result.memo.time);
    $("#svrInfoMemo").val(json.result.memo.memo);
  });
}

/** Function changes the selected temperature type (CPU, Ambient) -JJ- */
function chgSelectedTempType(direction){
  var typeArr = ["Ambient","CPU","All"];
  var newIndex;
  var index = typeArr.findIndex(function(element){
    return element == $("#selectedTempType").html();
  });
  if(direction == "left"){
    newIndex = index == 0? typeArr.length-1 : index-1;
  }
  else if(direction == "right"){
    newIndex = (index+1)%typeArr.length;
  }
  $("#selectedTempType").html(typeArr[newIndex]);

  ajaxUpdateMap("/api/v1/racks?site="+$("#inputCurrentSite").attr("val")+"&floor="+$("#inputCurrentFloor").attr("val")+"&number=1");
  ajaxUpdateHoles("/api/v1/racks/"+$("#detailsRackIdVal").attr("val"));
  ajaxUpdateLineChartbyUrl("/api/v1/servers/"+$("#detailsServerIdVal").attr("val")+"/stat");
}

/** Function cancels readonly prop of the memo textarea and activates buttons for save */
function modifyMemo(){
  $("#btnModify").hide(400);
  $("#btnCancel").show(400);
  $("#btnSave").show(400);
  $("#svrInfoMemo").prop("readonly", false);
  $("#dtlInfoWhoInChargeMain").prop("readonly", false);
  $("#dtlInfoWhoInchargeSub").prop("readonly", false);
}

/** Function saves memo text in database */
function saveMemo(){
  $("#btnCancel").hide(400);
  $("#btnSave").hide(400);
  $("#btnModify").show(400);
  $("#svrInfoMemo").prop("readonly", true);
  $("#dtlInfoWhoInChargeMain").prop("readonly", true);
  $("#dtlInfoWhoInchargeSub").prop("readonly", true);

  $.ajax({
    url: "/api/v1/servers/"+$("#detailsServerIdVal").attr("val"),
    type: "PUT",
    dataType : "json",
    data: JSON.stringify({
      memo: $("#svrInfoMemo").val(),
      c_main: $("#dtlInfoWhoInChargeMain").val(), 
      c_sub: $("#dtlInfoWhoInchargeSub").val()
    }),
    contentType: "application/json; charset=UTF-8"
  })
  .done(function(data){
    var json = data;
    var type, msg;
    // result_code == 1 means updating db is successful
    if(json.result_code == 1){
      type = "success";
      msg = "메모가 성공적으로 업데이트 되었습니다."
    }
    else{
      type = "danger";
      msg = "메모 업데이트를 실패했습니다."
    }

    notify(type, msg);
  });
}

function cancelMemo(){
  $("#btnCancel").hide(400);
  $("#btnSave").hide(400);
  $("#btnModify").show(400);
  $("#svrInfoMemo").prop("readonly", true);
  $("#dtlInfoWhoInChargeMain").prop("readonly", true);
  $("#dtlInfoWhoInchargeSub").prop("readonly", true);
}

/** 2019.06.05 Function pops up notification messages */
function notify(type,msg){
  $.growl({
    message: msg,
    url: ''
  },{
      element: 'body',
      type: type,
      allow_dismiss: true,
      offset: {
        x: 20,
        y: 85
      },
      spacing: 10,
      z_index: 1031,
      delay: 2500,
      timer: 1000,
      url_target: '_blank',
      mouse_over: false,
      icon_type: 'class',
      template: '<div data-growl="container" class="alert" role="alert">' +
              '<button type="button" class="close" data-growl="dismiss">' +
                '<span aria-hidden="true">&times;</span>' +
                '<span class="sr-only">Close</span>' +
              '</button>' +
              '<span data-growl="icon"></span>' +
              '<span data-growl="title"></span>' +
              '<span data-growl="message"></span>' +
              '<a href="#" data-growl="url"></a>' +
            '</div>'
  });
};

(function($){
  "use strict";

  const _PERIOD_ = 1000*60;
  var zoomRatio = 1.0;

  $.when(ajaxUpdateGridBackground("/api/v1/backgrounds/"+$("#inputCurrentSite").attr("val")+"?floor="+$("#inputCurrentFloor").attr("val")))
  .done(function(){
    /** Periodic AJAX Module */
    executeSetInterval(function(){
      ajaxUpdateHoles("/api/v1/racks/"+$("#detailsRackIdVal").attr("val"));
      ajaxUpdateMap("/api/v1/racks?site="+$("#inputCurrentSite").attr("val")+"&floor="+$("#inputCurrentFloor").attr("val")+"&number=1");
      ajaxUpdateLineChartbyUrl("/api/v1/servers/"+$("#detailsServerIdVal").attr("val")+"/stat");
    }, _PERIOD_);
  });

  /** 2019.05.28 Initialize Zoomer -JJ- */
  $("#mapZoomInTrigger").click(function(){
    zoomRatio = zoomRatio < 1.8? zoomRatio+0.2 : zoomRatio;
    $("#sktDetailsViewMap").css("transform", "scale("+zoomRatio+")");
  });
  $("#mapZoomOutTrigger").click(function(){
    zoomRatio = zoomRatio > 0.8? zoomRatio-0.2 : zoomRatio;
    $("#sktDetailsViewMap").css("transform", "scale("+zoomRatio+")");
  });
  $("#sktDetailsViewMap").draggable();

  /** 2019.06.03 Initialize tooltip -JJ- */
  $("[data-toggle='tooltip']").tooltip();

  /** 2019.06.03 Initialize memo button click event -JJ- */
  $("#btnModify").click(function(){modifyMemo();});
  $("#btnSave").click(function(){saveMemo();});
  $("#btnCancel").click(function(){cancelMemo();});

  /** 2019.06.03 Initialize server info -JJ- */
  ajaxGetSvrInfobyUrl("/api/v1/servers/"+$("#detailsServerIdVal").attr("val"));

  
})(jQuery);