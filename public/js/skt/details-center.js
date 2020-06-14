/** MIN, MAX values for color variation */
const _DT_MIN = 18;
const _DT_MAX = 50;

/** prevServerCoordinates are used to indicate the servers which didn't receive the new data with grey color */
/** prevServerCoordinates = {"x0y0","x2y5",...,} */
var prevServerCoordinates = new Set();

/** 2019.05.18 Customized setInterval function to execute the function before set setInterval action */
function executeSetInterval(func, delay){
  func();
  setInterval(func,delay);
}

/* 2019.05.16 dictionary(key,value) -> array[[key,value],...] -JJ- */
function dictToArray(dict){
  var array = [];
  for(key in dict){ array.push([key,dict[key]]); }
  return array;
}

/** 2019.05.28 Added function starts simulation -JJ- */
function startSimul(){

}

/** 2019.05.28 Added function ends simulation -JJ- */
function endSimul(){

}

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
        // Todo: check whether it works or not
        $("#"+coordinates[i][key]).data("rackId", rackId[i]);
        $("#"+coordinates[i][key]).attr("data-rackId", rackId[i]);
        $("#"+coordinates[i][key]).addClass("clickable-details-rack cursor-pointer " + addClass);

        /** 2019.05.19 Add tooltip contains the server names in the rack -JJ- */
        var tooltipTxt = "";
        rackServer[i].forEach(function(e){tooltipTxt = tooltipTxt + e + "<br>"});
        $("#"+coordinates[i][key]).attr("data-original-title", tooltipTxt);
      }
    }

    /** color grey for the elements in the set, prevServerCoordinates */
    prevServerCoordinates.forEach(function(e){
      $("#"+e).css("background", "rgba(60,60,60,0.9)");
    });
    prevServerCoordinates = tempSet;

    /** Clear old on-click event -JJ- */
    $(".clickable-details-rack").unbind("click");
    /** Add on-click event to grid elements -JJ- */
    $(".clickable-details-rack").click(function(){
      $("#detailsRackIdVal").attr("val", $("#"+event.target.id).attr("data-rackId"));
    });

    var mindt;
    var maxtemp;
    /** Find minimum downtime and maximum temperature */
    for(var i=0; i<downtime.length; i++){
      if(mindt==undefined || downtime[i] < mindt) mindt = downtime[i];
      if(maxtemp==undefined || maxtemp < tempMax[i]) maxtemp = tempMax[i];
    }
    if($("#simulCheckbox").prop("checked")){
      $("#simulMinDtVal").html(mindt);
      $("#simulMaxTempVal").html(maxtemp);
    }
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

      $("#"+coordinates[key]).addClass(addClass);
    }

    /** Equip Drawing & Painting */
    for(var key in coordinates_equip){
      var addClass = "";
      var html = {
        "SWITCH&ROUTER": ["&nbsp&nbspS&nbsp&nbsp", "&nbsp&nbspR&nbsp&nbsp"],
        "SERVER": ["&nbsp&nbspE&nbsp&nbsp", "&nbsp&nbspQ&nbsp&nbsp"]
      }
      if(image_equip[key] == "SWITCH&ROUTER"){
        addClass = addClass + "grid-td-sr ";
        
      }
      else if(image_equip[key] == "SERVER"){
        addClass = addClass + "grid-td-server ";
      }

      for(var i in coordinates_equip[key]){
        $("#"+coordinates_equip[key][i]).addClass(addClass);
        $("#"+coordinates_equip[key][i]).html(html[image_equip[key]][i]);
      }
    }
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
  console.log(typeArr[newIndex]);
  $("#selectedTempType").html(typeArr[newIndex]);
  ajaxUpdateMap("/api/v1/racks?site="+$("#inputCurrentSite").attr("val")+"&floor="+$("#inputCurrentFloor").attr("val")+
    "&number="+$("#inputCurrentNumber").attr("val")+"&simparam="+$("#simulDelta").html());
  ajaxUpdateCenterViewCharts("/api/v1/servers?site="+$("#inputCurrentSite").attr("val")+"&floor="+$("#inputCurrentFloor").attr("val")+
    "&number="+$("#inputCurrentNumber").attr("val")+"&simparam="+$("#simulDelta").html());
}

/** Function changes the selected temperature value (Temperature, Ratio) -JJ- */
function chgSelectedTempVal(){
  $("#sktTempModeSelector").find(".skt-center-mode-selected").removeClass("skt-center-mode-selected");
  $("#sktTempModeSelector").find(".skt-center-mode-unselected").removeClass("skt-center-mode-unselected");
  $("#sktTempModeSelector").find(".skt-center-mode").addClass("skt-center-mode-unselected");
  $("#"+event.target.id).removeClass("skt-center-mode-unselected").addClass("skt-center-mode-selected");

  /** Update chart */
  ajaxUpdateCenterViewCharts("/api/v1/servers?site="+$("#inputCurrentSite").attr("val")+"&floor="+$("#inputCurrentFloor").attr("val")+
    "&number="+$("#inputCurrentNumber").attr("val"));
}

/** Function updates the bar charts and table */
/** Dependency : drawTempChart(), drawDtTable() */
function ajaxUpdateCenterViewCharts(url){

  $.ajax({
    url: url,
    type: "GET"
  })
  .done(function(data){
    var json = JSON.parse(data);
    var dict_tempAmbient = {};
    var dict_tempRatioAmbient = {};
    var dict_tempCpu = {};
    var dict_tempRatioCpu = {};
    var dict_dtCpu = {};
    var dict_dtAmb = {};

    /** temperature data process -> use dictionary for chart data */
    json.result.tempAmbient.forEach(function(e){
      if(e in dict_tempAmbient){ dict_tempAmbient[e] = dict_tempAmbient[e]+1; }
      else { dict_tempAmbient[e] = 1; }
    });
    json.result.tempRatioAmbient.forEach(function(e){
      if(e in dict_tempRatioAmbient){ dict_tempRatioAmbient[e] = dict_tempRatioAmbient[e]+1; }
      else { dict_tempRatioAmbient[e] = 1; }
    });
    json.result.tempCpu.forEach(function(e){
      if(e in dict_tempCpu){ dict_tempCpu[e] = dict_tempCpu[e]+1; }
      else { dict_tempCpu[e] = 1; }
    });
    json.result.tempRatioCpu.forEach(function(e){
      if(e in dict_tempRatioCpu){ dict_tempRatioCpu[e] = dict_tempRatioCpu[e]+1; }
      else { dict_tempRatioCpu[e] = 1; }
    });

    /** downtime data process -> use dictionary for table data */
    json.result.downtimeCpu.forEach(function(e){
      if(e in dict_dtCpu){ dict_dtCpu[e] = dict_dtCpu[e]+1; }
      else { dict_dtCpu[e] = 1; }
    });
    json.result.downtimeAmb.forEach(function(e){
      if(e in dict_dtAmb){ dict_dtAmb[e] = dict_dtAmb[e]+1; }
      else { dict_dtAmb[e] = 1; }
    });

    if($("#selectedTempType").html()==="CPU" && $("#sktTempModeSelector").find(".skt-center-mode-selected").html() == "온도"){
      drawTempChart("temp",dictToArray(dict_tempCpu),"barChartCenterTemp");
    }
    else if($("#selectedTempType").html() === "CPU" && $("#sktTempModeSelector").find(".skt-center-mode-selected").html() == "임계치 대비 비율"){
      drawTempChart("ratio", dictToArray(dict_tempRatioCpu),"barChartCenterTemp");
    }
    else if($("#selectedTempType").html()==="Ambient" && $("#sktTempModeSelector").find(".skt-center-mode-selected").html() == "온도"){
      drawTempChart("temp",dictToArray(dict_tempAmbient),"barChartCenterTemp");
    }
    else if($("#selectedTempType").html() === "Ambient" && $("#sktTempModeSelector").find(".skt-center-mode-selected").html() == "임계치 대비 비율"){
      drawTempChart("ratio", dictToArray(dict_tempRatioAmbient), "barChartCenterTemp");
    }
    drawDtTable(json, "dtTd");
  });
}

/** Function updates the bar chart */
function drawTempChart(tempType, data, elementId){
  var tempData =[{
    data: data,
    color: "#44af69"
  }];

  $("#"+elementId)[0] && $.plot($("#"+elementId), tempData, {
      series: {
          bars: {
              show: true,
              barWidth: .1,
              order: 1,
              fill: 1
          },
      },
      grid: {
          borderWidth: 1,
          borderColor: "transparent",
          borderColor: {
            top: "transparent",
            right: "transparent",
            bottom: "#eeeeee",
            left: "#eeeeee"
          },
          show: true,
          hoverable: !0,
          clickable: !0
      },
      yaxis: {
          tickColor: "transparent",
          tickDecimals: 0,
          font: {
              lineHeight: 14,
              style: "normal",
              color: "#eeeeee"
          },
          shadowSize: 0
      },
      xaxis: {
          tickColor: "transparent",
          tickDecimals: 0,
          font: {
              lineHeight: 14,
              style: "normal",
              color: "#eeeeee"
          },
          shadowSize: 0
      },
      legend: {
          container: ".flc-bar",
          backgroundOpacity: .5,
          noColumns: 0,
          backgroundColor: "white",
          lineWidth: 0
      },
      hooks: {
        processRawData:{
          autoscale: true
        }
      }
  }), $(".flot-chart")[0] && ($(".flot-chart").bind("plothover", function(event, pos, item) {
      if (item) {
          var x = item.datapoint[0].toFixed(2),
              y = item.datapoint[1].toFixed(2);
          $(".flot-tooltip").html(item.series.label + " of " + x + " = " + y).css({
              top: item.pageY + 5,
              left: item.pageX + 5
          }).show()
      } else $(".flot-tooltip").hide()
  }), $("<div class='flot-tooltip' class='chart-tooltip'></div>").appendTo("body"));
}

/** Function updates Downtime distribution chart */
function drawDtTable(jsonAjaxResult, elementTdId){
  var json = jsonAjaxResult;
  var dt=[];
  var range = {};

  var boundaries = [10,20,30,40,50,60,70];
  for(key in boundaries){
    var temp = [];
    range[boundaries[key]] = temp;
  }

  if($("#selectedTempType").html()==="CPU"){
    dt = json.result.downtimeCpu;
  }
  else if($("#selectedTempType").html()==="Ambient"){
    dt = json.result.downtimeAmb;
  }
  else if($("#selectedTempType").html()==="All"){
    for(var key in json.result.serverId){
      dt.push(Math.min(json.result.downtimeCpu[key], json.result.downtimeAmb[key]));
    }
  }

  dt.forEach(function(e){
    if(e>=60) range[boundaries[6]].push(e);
    else if(e>=50) range[boundaries[5]].push(e);
    else if(e>=40) range[boundaries[4]].push(e);
    else if(e>=30) range[boundaries[3]].push(e);
    else if(e>=20) range[boundaries[2]].push(e);
    else if(e>=10) range[boundaries[1]].push(e);
    else range[boundaries[0]].push(e);
  });

  for(key in range){ $("#"+elementTdId+key).html(range[key].length); }
}

(function($){
  "use strict";

  const _PERIOD_ = 1000*60;
  var zoomRatio = 1.0;

  $.when(ajaxUpdateGridBackground("/api/v1/backgrounds/"+$("#inputCurrentSite").attr("val")+"?floor="+$("#inputCurrentFloor").attr("val")))
  .done(function(){
    /** Periodic AJAX Module */
    executeSetInterval(function(){
      ajaxUpdateMap("/api/v1/racks?site="+$("#inputCurrentSite").attr("val")+"&floor="+$("#inputCurrentFloor").attr("val")+
        "&number="+$("#inputCurrentNumber").attr("val")+"&simparam="+$("#simulDelta").html());
      ajaxUpdateCenterViewCharts("/api/v1/servers?site="+$("#inputCurrentSite").attr("val")+"&floor="+$("#inputCurrentFloor").attr("val")+
        "&number="+$("#inputCurrentNumber").attr("val"));
    }, _PERIOD_);
  });

  /** 2019.05.28 Initialize Zoomer -JJ- */
  $("#mapZoomInTrigger").click(function(){
    zoomRatio = zoomRatio < 1.8? zoomRatio+0.2 : zoomRatio;
    $("#sktCenterMap").css("transform", "scale("+zoomRatio+")");
  });
  $("#mapZoomOutTrigger").click(function(){
    zoomRatio = zoomRatio > 0.8? zoomRatio-0.2 : zoomRatio;
    $("#sktCenterMap").css("transform", "scale("+zoomRatio+")");
  });
  $("#sktCenterMap").draggable();

  /** 2019.05.28 Initialize simulation on and off button -JJ- */
  $("#simulCheckbox").change(function(){
    if($("#simulCheckbox").prop("checked")){
      $(".skt-center-view-container-simul").css("min-height","300px").find(".skt-center-view-simul-row").css("display","block");
      $("#inputSimulStatus").attr("val","on");
      ajaxUpdateMap("/api/v1/racks?site="+$("#inputCurrentSite").attr("val")+"&floor="+$("#inputCurrentFloor").attr("val")+
        "&number="+$("#inputCurrentNumber").attr("val")+"&simparam="+$("#simulDelta").html());
    }
    else {
      $(".skt-center-view-simul-row").css("display", "none").parent().css("min-height","130px");
      $("#inputSimulStatus").attr("val","off");
      $("#simulDelta").html("0");
      ajaxUpdateMap("/api/v1/racks?site="+$("#inputCurrentSite").attr("val")+"&floor="+$("#inputCurrentFloor").attr("val")+
        "&number="+$("#inputCurrentNumber").attr("val")+"&simparam="+$("#simulDelta").html());
      ajaxUpdateCenterViewCharts("/api/v1/servers?site="+$("#inputCurrentSite").attr("val")+"&floor="+$("#inputCurrentFloor").attr("val")+
        "&number="+$("#inputCurrentNumber").attr("val"));
      $("#simulMinDtVal").html("");
      $("#simulMaxTempVal").html("");
    }
  });
  $(".skt-center-simul-icon").click(function(){
    var delta = 0;
    if(event.target.id == "simulTempPlus") delta = 1;
    else if(event.target.id == "simulTempMinus") delta = -1;
    $("#simulDelta").html(parseInt($("#simulDelta").html()) + delta);
    ajaxUpdateMap("/api/v1/racks?site="+$("#inputCurrentSite").attr("val")+"&floor="+$("#inputCurrentFloor").attr("val")+
      "&number="+$("#inputCurrentNumber").attr("val")+"&simparam="+$("#simulDelta").html());
    ajaxUpdateCenterViewCharts("/api/v1/servers?site="+$("#inputCurrentSite").attr("val")+"&floor="+$("#inputCurrentFloor").attr("val")+
      "&number="+$("#inputCurrentNumber").attr("val")+"&simparam="+$("#simulDelta").html());
  });

  /** 2019.06.03 Initialize tooltip -JJ- */
  $("[data-toggle='tooltip']").tooltip();

  
})(jQuery);