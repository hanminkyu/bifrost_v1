/** draw variable is used to plot charts -JJ- */
var draw = {
  cpuNormal: [],
  cpuMin: [],
  cpuMaj: [],
  cpuCri: [],
  ambNormal: [],
  ambMin: [],
  ambMaj: [],
  ambCri: []
};

const _RATIO_CRI = 91;
const _RATIO_MAJ = 88;
const _RATIO_MIN = 85;
const _DT_NUM_RED = 0;
const _DT_MIN = 37;
const _DT_MAJ = 29;
const _DT_CRI = 17;

/** 2019.05.26 Added function calculates the timestamp after particular minutes -JJ- */
function addMinutes(date, minutes){
  var a = new Date(date);
  // TODO : change minutes*1000 to minutes*60000
  return new Date(a.getTime() + minutes*60000);
}

/** 2019.05.17 AJAX function updates innerHTML content -JJ- */
function ajaxUpdateHTMLbyId(url, elementId){
  $.ajax({
    url: url,
    type: "GET"
  })
  .done(function(data){
    var json = JSON.parse(data);
    var val = json.result.value;
    $("#"+elementId).html(val);
  });
}

/** 2019.05.23 AJAX function updates SKT Summary Panel -JJ- */
function ajaxUpdateSmrElements(url){

  $.ajax({
    url: url,
    type: "GET"
  })
  .done(function(data){
    var json = JSON.parse(data);
    for(key in json.result){
      if(key != "smrCoolerInfo" && key != "smrTempMax"){
        var value = json.result[key].value;
        var serverName = json.result[key].serverName;
        var floor = json.result[key].floor;
        var serverId = json.result[key].serverId;
        var rack = json.result[key].rack;
        var rackid = json.result[key].rackid;
        var modalId,tempTarget;
        var isGrandParent = true;
        var needToCheckThreshold = true;
        var value_min = 0;
        var value_maj = 0;
        var value_cri = 0;
        var statusClass = "btn-status-green";
        var statusText = "normal";

        if(!Array.isArray(serverId)){ 
          /** Handling the value not in array */
          serverName = [serverName];
          floor = [floor];
          serverId = [serverId];
          rack = [rack];
          rackid = [rackid];
        }

        if(key == "smrCpuDown") {modalId = "sktSmrModalOne"; tempTarget="CPU"; isGrandParent=false; }
        else if(key == "smrCpuMax") {modalId = "sktSmrModalTwo"; tempTarget="CPU"; needToCheckThreshold=false; }
        else if(key == "smrCpuRatioMax") {modalId = "sktSmrModalTwo"; tempTarget="CPU"; }
        else if(key == "smrAmbDown") {modalId = "sktSmrModalThree"; tempTarget="Ambient"; isGrandParent=false; }
        else if(key == "smrAmbMax") {modalId = "sktSmrModalFour"; tempTarget="Ambient"; needToCheckThreshold=false; }
        else if(key == "smrAmbRatioMax") {modalId ="sktSmrModalFour"; tempTarget="Ambient"; }
        else console.log("Error : unknown elementId");

        /** Ratio */
        if(isGrandParent && needToCheckThreshold){
          $("#"+key).html(value);
          if(value >= _RATIO_CRI) { statusClass = "cri-alert-on btn-status-cri"; statusText = "critical" }
          else if(value >= _RATIO_MAJ) { statusClass = "maj-alert-on btn-status-maj"; statusText = "major"; }
          else if(value >= _RATIO_MIN) { statusClass = "min-alert-on btn-status-min"; statusText = "minor"; }
        }
        /** Downtime */
        else if(!isGrandParent && needToCheckThreshold){
          var tempClass = [];
          for(var i in value){

            /** Error handling for receiving null value from server */
            if(value[i] == null) {
              tempClass.push("Error");
              continue;
            }
            if(value[i] <= _DT_CRI){ value_cri++; tempClass.push("Critical"); }
            else if(value[i] <= _DT_MAJ) { value_maj++; tempClass.push("Major"); }
            else if(value[i] <= _DT_MIN) { value_min++; tempClass.push("Minor"); }
          }
          $("#"+key+"Cri").html(value_cri);
          $("#"+key+"Major").html(value_maj);
          $("#"+key+"Minor").html(value_min);
          if(value_min) { statusClass = "min-alert-on btn-status-min"; statusText = "minor"; }
          if(value_maj) { statusClass = "maj-alert-on btn-status-maj"; statusText = "major"; }
          if(value_cri) { statusClass = "cri-alert-on btn-status-cri"; statusText = "critical"; }
        }
        /** maxTemp */
        else if(isGrandParent && !needToCheckThreshold){
          $("#"+key).html(value);
        }

        /** Alert status apply to Downtime panel */
        if(needToCheckThreshold){
          if($("#"+key).length == 0){
            $("#"+key+"Cri").parent().parent().find(".btn-status").removeClass("cri-alert-on maj-alert-on min-alert-on btn-status-green btn-status-cri btn-status-maj btn-status-min");
            $("#"+key+"Cri").parent().parent().find(".btn-status").addClass(statusClass).html(statusText);
          }
          else{
            $("#"+key).parent().parent().find(".btn-status").removeClass("cri-alert-on maj-alert-on min-alert-on btn-status-green btn-status-cri btn-status-maj btn-status-min");
            $("#"+key).parent().parent().find(".btn-status").addClass(statusClass).html(statusText);
          }
        }

        /** Remove previous result */
        $("#"+modalId).find(".smr-added-"+key.toLowerCase()).remove();

        /** Append detail info to summary modal */
        for(var i=0; i<serverId.length; i++){
          if(key == "smrAmbMax" || key == "smrCpuMax"){
            $("#"+modalId).find(".skt-modal-type-container").append("<p class='skt-smr-modal-txt smr-added-" +
            key.toLowerCase()+"'>"+"Max온도("+value+"℃)</p>");
          }
          else if(key == "smrAmbRatioMax" || key == "smrCpuRatioMax"){
            $("#"+modalId).find(".skt-modal-type-container").append("<p class='skt-smr-modal-txt smr-added-" +
            key.toLowerCase()+"'>"+"Max임계치("+value+"%)</p>");
          }
          else if(key == "smrAmbDown" || key == "smrCpuDown"){
            $("#"+modalId).find(".skt-modal-type-container").append("<p class='skt-smr-temp-type-"+tempClass[i].toLowerCase() + 
            " skt-smr-modal-txt smr-added-" + key.toLowerCase()+"'>"+tempClass[i]+"("+value[i]+"분)"+"</p>");
          }
          $("#"+modalId).find(".skt-modal-name-container").append("<p class='skt-smr-modal-txt smr-added-" +
          key.toLowerCase()+"'>"+serverName[i]+"</p>");
          $("#"+modalId).find(".skt-modal-floor-container").append("<p class='skt-smr-modal-txt smr-added-" + 
          key.toLowerCase()+"'>"+floor[i]+"</p>");
          $("#"+modalId).find(".skt-modal-location-container").append("<p class='skt-smr-modal-txt smr-added-" +
          key.toLowerCase()+"'>"+rack[i]+"</p>");
          $("#"+modalId).find(".skt-modal-button-container").append("<p"+
          " class='skt-smr-modal-button smr-added-"+key.toLowerCase()+"' data-linkid='" +
          serverId[i]+"' onclick=showDetails("+"'"+$("#inputCurrentSite").attr("val")+"'"+",'"+floor[i]+
          "',1,'"+rack[i]+"',"+rackid[i]+","+serverId[i]+",'"+serverName[i]+"','"+tempTarget+"')><span>Click</span></p>");
        }
      }

      else if(key == "smrCoolerInfo"){
        var alarm_class = json.result[key].class;
        var contents = json.result[key].contents;
        var location = json.result[key].location;
        var servertime = json.result[key].servertime;
        
        var alarm_count = alarm_class.length;

        // Write alarm count to #smrCoolerInfo element
        $("#smrCoolerInfo").html(alarm_count);

        // Alarm status
        var statusClass = "btn-status-green";
        var statusText = "Normal";
        if(alarm_count){
          statusClass = "cooler-cri-alert-on btn-status-cri";
          statusText = "Critical";
        }
        $("#smrCoolerInfo").parent().parent().find(".btn-status").removeClass("cooler-cri-alert-on cooler-maj-alert-on cooler-min-alert-on btn-status-green btn-status-cri btn-status-maj btn-status-min");
        $("#smrCoolerInfo").parent().parent().find(".btn-status").addClass(statusClass).html(statusText);

        /** Remove previous result */
        $("#sktSmrModalSix").find(".smr-added-"+key.toLowerCase()).remove();

        /** Append detail info to summary modal */
        for(var i=0; i<contents.length; i++){
          $("#sktSmrModalSix").find(".skt-modal-time-container").append("<p class='skt-smr-modal-txt smr-added-" +
            key.toLowerCase()+"'>"+servertime[i]+"</p>");
          $("#sktSmrModalSix").find(".skt-modal-location-container").append("<p class='skt-smr-modal-txt smr-added-" +
            key.toLowerCase()+"'>"+location[i]+"</p>");
          $("#sktSmrModalSix").find(".skt-modal-event-container").append("<p class='skt-smr-modal-txt smr-added-" + 
            key.toLowerCase()+"'>"+contents[i]+"</p>");
        }
      }

      else if(key == "smrTempMax"){
        var amb_value = json.result[key].amb_value;
        var amb_rack = json.result[key].amb_rack;
        var amb_rackid = json.result[key].amb_rackid;
        var amb_serverName = json.result[key].amb_serverName;
        var amb_serverId = json.result[key].amb_serverId;
        var amb_floor = json.result[key].amb_floor;
        var cpu_value = json.result[key].cpu_value;
        var cpu_rack = json.result[key].cpu_rack;
        var cpu_rackid = json.result[key].cpu_rackid;
        var cpu_serverName = json.result[key].cpu_serverName;
        var cpu_serverId = json.result[key].cpu_serverId;
        var cpu_floor = json.result[key].cpu_floor;

        $("#smrAmbMax").html(amb_value);
        $("#smrCpuMax").html(cpu_value);
        $("#smrAmbMaxServerName").html(amb_serverName);
        $("#smrCpuMaxServerName").html(cpu_serverName);

        var statusClass = "btn-status-green";
        var statusText = "Normal";

        $("#smrAmbMax").parent().parent().find(".btn-status").removeClass("cri-alert-on maj-alert-on min-alert-on btn-status-green btn-status-cri btn-status-maj btn-status-min");
        $("#smrAmbMax").parent().parent().find(".btn-status").addClass(statusClass).html(statusText);

        /** Remove previous result */
        $("#sktSmrModalFive").find(".smr-added-"+key.toLowerCase()).remove();

        /** Append detail info to summary modal */
        $("#sktSmrModalFive").find(".skt-modal-type-container").append("<p class='skt-smr-modal-txt smr-added-" +
          key.toLowerCase()+"'>"+"Ambient("+amb_value+"℃)</p>");
        $("#sktSmrModalFive").find(".skt-modal-name-container").append("<p class='skt-smr-modal-txt smr-added-" +
          key.toLowerCase()+"'>"+amb_serverName+"</p>");
        $("#sktSmrModalFive").find(".skt-modal-floor-container").append("<p class='skt-smr-modal-txt smr-added-" + 
          key.toLowerCase()+"'>"+amb_floor+"</p>");
        $("#sktSmrModalFive").find(".skt-modal-location-container").append("<p class='skt-smr-modal-txt smr-added-" +
          key.toLowerCase()+"'>"+amb_rack+"</p>");
        $("#sktSmrModalFive").find(".skt-modal-button-container").append("<p"+
          " class='skt-smr-modal-button smr-added-"+key.toLowerCase()+"' data-linkid='" +
          amb_serverId+"' onclick=showDetails("+"'"+$("#inputCurrentSite").attr("val")+"'"+",'"+amb_floor+
          "',1,'"+amb_rack+"',"+amb_rackid+","+amb_serverId+",'"+amb_serverName+"','Ambient')><span>Click</span></p>");

        $("#sktSmrModalFive").find(".skt-modal-type-container").append("<p class='skt-smr-modal-txt smr-added-" +
          key.toLowerCase()+"'>"+"CPU("+cpu_value+"℃)</p>");
        $("#sktSmrModalFive").find(".skt-modal-name-container").append("<p class='skt-smr-modal-txt smr-added-" +
          key.toLowerCase()+"'>"+cpu_serverName+"</p>");
        $("#sktSmrModalFive").find(".skt-modal-floor-container").append("<p class='skt-smr-modal-txt smr-added-" + 
          key.toLowerCase()+"'>"+cpu_floor+"</p>");
        $("#sktSmrModalFive").find(".skt-modal-location-container").append("<p class='skt-smr-modal-txt smr-added-" +
          key.toLowerCase()+"'>"+cpu_rack+"</p>");
        $("#sktSmrModalFive").find(".skt-modal-button-container").append("<p"+
          " class='skt-smr-modal-button smr-added-"+key.toLowerCase()+"' data-linkid='" +
          cpu_serverId+"' onclick=showDetails("+"'"+$("#inputCurrentSite").attr("val")+"'"+",'"+cpu_floor+
          "',1,'"+cpu_rack+"',"+cpu_rackid+","+cpu_serverId+",'"+cpu_serverName+"','CPU')><span>Click</span></p>");

      }

    }

  });
}

function ajaxUpdateAlarmPanel(url){
  $.ajax({
    url: url,
    type: "GET"
  })
  .done(function(data){
    var json = JSON.parse(data);
    var alarmsId = json.result.alarmsId;
    var eventTime = json.result.eventTime;
    var serverName = json.result.serverName;
    var serverLocation = json.result.serverLocation;
    var floor = json.result.floor;
    var event = json.result.event;
    $("#alarm-table").find(".skt-alarm-txt").remove();

    alarmsId.forEach(function(e,index){
      var timeAddHtml = "<p class='skt-alarm-txt'>"+eventTime[index]+"</p>";
      var targetAddHtml = "<p class='skt-alarm-txt'>"+serverName[index]+"</p>";
      var locationAddHtml = "<p class='skt-alarm-txt'>"+floor[index]+"F "+serverLocation[index]+"</p>";
      var eventAddHtml = "<p class='skt-alarm-txt'>"+event[index]+"</p>";
      $("#alarmEventTimeContainer").append(timeAddHtml);
      $("#alarmTargetContainer").append(targetAddHtml);
      $("#alarmLocationContainer").append(locationAddHtml);
      $("#alarmDetailsContainer").append(eventAddHtml);
    });
  });
}

/** 2019.05.26 Function draws line chart by (data,id) -JJ- */
function drawLineChart(dataBottom, dataMiddle1, dataMiddle2, dataTop, elementId){
  var options = {
    series: {
      shadowSize: 0,
      lines: {
        show: !1,
        lineWidth: 0
      }
    },
    grid: {
      borderWidth: 0,
      labelMargin: 10,
      hoverable: !0,
      clickable: !0,
      mouseActiveRadius: 6
    },
    xaxis: {
      show: 1,
      ticks: 10,
      tickColor: "#555555",
      mode: "time",
      timezone: "browser",
      font: {
        size: 12,
        color: "#eeeeee",
        weight: "bold"
      }
    },
    yaxis: {
      show: 1,
      tickDecimals: 0,
      ticks: 10,
      tickColor: "#555555",
      font: {
        size: 0,
        color: "#eeeeee",
        weight: "bold"
      },
      max: 100
    },
    legend: {
      show: !1
    }
  };
  $("#" + elementId)[0] && $.plot($("#"+elementId), [{
    data: dataTop,
    lines: {
      show: !0,
      fill: .90
    },
    label: "Downtime 37분 초과",
    stack: !0,
    color: "#44af69"
  }, {
    data: dataMiddle2,
    lines: {
      show: !0,
      fill: .90
    },
    label: "Downtime 37분 이하",
    stack: !0,
    color: "#ffe120"
  }, {
    data: dataMiddle1,
    lines: {
      show: !0,
      fill: .90
    },
    label: "Downtime 29분 이하",
    stack: !0,
    color: "#ff9926"
  }, {
    data: dataBottom,
    lines: {
      show: !0,
      fill: .90
    },
    label: "Downtime 17분 이하",
    stack: !0,
    color: "#f8333c"
  }], options), $(".flot-chart")[0] && ($(".flot-chart").bind("plothover", function(event, pos, item) {
    if (item) {
      var x = item.datapoint[0].toFixed(2),
        y = item.datapoint[1].toFixed(2);
      $(".flot-tooltip").html(item.series.label + " of " + x + " = " + y).css({
        top: item.pageY + 5,
        left: item.pageX + 5
      }).show()
    } else $(".flot-tooltip").hide()
  }), $(".tooltip-"+elementId)[0] || $("<div class='flot-tooltip tooltip-"+elementId+"' class='chart-tooltip'></div>").appendTo("body"));
}

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

/** main function is loaded after DOM creating */
(function($){
  "use strict";

   const _PERIOD_ = 1000*60;
   const _PERIOD_LONG_ = 1000*60*60;
  /** _RANGE is in the minutes */
   const _RANGE = 6*60;

  /** periodic AJAX module lists -JJ- */
  executeSetInterval(function(){
    /** periodic AJAX module - summary_temperature -JJ- */
    ajaxUpdateSmrElements("/api/v1/summary/all/current?site="+$("#inputCurrentSite").attr("val"));

    /** periodic AJAX module - alarm -JJ- */
    ajaxUpdateAlarmPanel("/api/v1/alarms?site="+$("#inputCurrentSite").attr("val"));
  },_PERIOD_);

  /** periodic AJAX module - line chart -JJ- */
  executeSetInterval(function(){
    /** Get current time for plotting data */
    var currentTime = Date.now();

    $.ajax({
      url: "/api/v1/servers?site="+$("#inputCurrentSite").attr("val"),
      type: "GET"
    })
    .done(function(data){
      var json = JSON.parse(data);
      var dtCpu = json.result.downtimeCpu;
      var dtAmb = json.result.downtimeAmb;
      var countCpu = {
        normal : 0,
        min : 0,
        maj : 0,
        cri : 0
      };
      var countAmb = {
        normal : 0,
        min : 0,
        maj : 0,
        cri : 0
      };

      dtCpu.some(function(e){
        /** Error handling for receiving null value from server */
        if(e == null) return false;

        if(e <= _DT_CRI) countCpu.cri++;
        else if(e <= _DT_MAJ) countCpu.maj++;
        else if(e <= _DT_MIN) countCpu.min++;
        else if(e > _DT_MIN) countCpu.normal++;
      });
      dtAmb.some(function(e){
        /** Error handling for receiving null value from server */
        if(e == null) return false;

        if(e <= _DT_CRI) countAmb.cri++;
        else if(e <= _DT_MAJ) countAmb.maj++;
        else if(e <= _DT_MIN) countAmb.min++;
        else if(e > _DT_MIN) countAmb.normal++;
      });
      /** Apply the counts to the text elements */
      $("#sktCpuDtDistNormal").html(countCpu.normal);
      $("#sktCpuDtDistMin").html(countCpu.min);
      $("#sktCpuDtDistMaj").html(countCpu.maj);
      $("#sktCpuDtDistCri").html(countCpu.cri);
      $("#sktAmbDtDistNormal").html(countAmb.normal);
      $("#sktAmbDtDistMin").html(countAmb.min);
      $("#sktAmbDtDistMaj").html(countAmb.maj);
      $("#sktAmbDtDistCri").html(countAmb.cri);

      /** data modification is applied for visualization */
      /** make them seem bigger than it is (RED & YELLOW) - multiply 10 to yellow and red counts*/
      var tempCpu = countCpu.normal + 10*countCpu.min + 10*countCpu.maj + 10*countCpu.cri;
      var tempAmb = countAmb.normal + 10*countAmb.min + 10*countAmb.maj + 10*countAmb.cri;
      draw.cpuCri.push([currentTime, 10*countCpu.cri/tempCpu*100]);
      draw.cpuMaj.push([currentTime, (10*countCpu.cri + 10*countCpu.maj)/tempCpu*100]);
      draw.cpuMin.push([currentTime, (10*countCpu.cri + 10*countCpu.maj + 10*countCpu.min)/tempCpu*100]);
      draw.cpuNormal.push([currentTime, (10*countCpu.cri + 10*countCpu.maj + 10*countCpu.min + countCpu.normal)/tempCpu*100]);
      draw.ambCri.push([currentTime, 10*countAmb.cri/tempAmb*100]);
      draw.ambMaj.push([currentTime, (10*countAmb.cri + 10*countAmb.maj)/tempAmb*100]);
      draw.ambMin.push([currentTime, (10*countAmb.cri + 10*countAmb.maj + 10*countAmb.min)/tempAmb*100]);
      draw.ambNormal.push([currentTime, (10*countAmb.cri + 10*countAmb.maj + 10*countAmb.min + countAmb.normal)/tempAmb*100]);

      for(var key in draw){
        while(draw[key].length > _RANGE) draw[key].shift();
      }

      var concatResult = {
        cpuNormal: [],
        cpuMin: [],
        cpuMaj: [],
        cpuCri: [],
        ambNormal: [],
        ambMin: [],
        ambMaj: [],
        ambCri: []
      };
  
      for(var key in draw){
        var padding = [];
        var n = 1;
  
        while(draw[key].length + n - 1 < _RANGE){
          padding.push([addMinutes(currentTime,n), null]);
          n = n+1;
        }
        concatResult[key] = draw[key].concat(padding);
      }
      
      /** Draw line charts */
      drawLineChart(concatResult.cpuCri,concatResult.cpuMaj,concatResult.cpuMin,concatResult.cpuNormal,"sktLineChartCpu");
      drawLineChart(concatResult.ambCri,concatResult.ambMaj,concatResult.ambMin,concatResult.ambNormal,"sktLineChartAmb");
    });
  },_PERIOD_);
  

  /** periodic Twinkle module -JJ- */
  executeSetInterval(function(){
    $(".btn-status-cri").twinkle({
      'effect': 'splash',
      'effectOptions': {
        'color': 'rgba(255,0,0,0.7)',
        'radius': 150,
        'duration': 1000
      }
    });
    $(".btn-status-maj").twinkle({
      'effect': 'splash',
      'effectOptions': {
        'color': 'rgba(255,153,38,0.7)',
        'radius': 150,
        'duration': 1000
      }
    });
    $(".btn-status-min").twinkle({
      'effect': 'splash',
      'effectOptions': {
        'color': 'rgba(255,225,32,0.7)',
        'radius': 150,
        'duration': 1000
      }
    });
  }, 1000);

  /** Initialize On Click Event -JJ- */
  //$(".clickable-details-stat").click(showDetailsStat("/details/stat/"+$(this).id));
  $(".clickable-details-stat").click(function(){
    window.open(convertTxtToUrlEncoding("/details/stat/"+(event.target.id)+"?site="+
    $("#inputCurrentSite").attr("val")), "detailsWindow"+event.target.id, "toolbar=no, "+
    "menubar=no, resizable=yes, width=800px, height=600px");
  });

  /** Scrollbar activation (Alarm Panel) -JJ- */
  // TODO : Modal에 Scrollbar 적용하기
  $("#alarm-panel").mCustomScrollbar({
    autoHideScrollbar: false,
    scrollbarPosition: "inside",
    theme:"light-1"
  });
})(jQuery);
