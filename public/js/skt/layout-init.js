var chkboxLoaded = false;

/** collectionServer dictionary - if value is true, the item is masked */
var collectionServers = {};


/** 2019.05.20 Added converter function for URL encoding compatibility -JJ- */
function convertTxtToUrlEncoding(txt){
  var temp = txt;
  temp=temp.replace(/\!/g,"%21");
  temp=temp.replace(/\#/g,"%23");
  temp=temp.replace(/\,/g,"%2C");
  temp=temp.replace(/\./g,"%2E");
  temp=temp.replace(/\@/g,"%40");
  return temp;
}

/** 2019.05.24 Added function pops another window and shows details of the server -JJ- */
// TODO : number arguments에 추가 필요
function showDetails(site,floor,number,rack,rackid,serverId,serverName,tempTarget){
  var options = ['height='+screen.height, 'width='+screen.width, 'fullscreen=yes'].join(',');
  var url = convertTxtToUrlEncoding("/details/view?site="+site+"&floor="+floor+"&number="+number+"&rack="+rack+"&rackId="+rackid+"&serverId="+serverId+
  "&tempTarget="+tempTarget+"&serverName="+serverName);
  window.open(url, 'detailsWindow', options);
}

/** 2019.05.27 Added function pops another window for particular place view -JJ- */
function showCenter(site, floor, number){
  var options = ['height='+screen.height, 'width='+screen.width, 'fullscreen=yes'].join(',');
  window.open("/details/center?site="+site+"&floor="+floor+"&number="+number, 'popup_window', options);
}

/** 2019.05.18 Customized setInterval function to execute the function before set setInterval action */
function executeSetInterval(func, delay){
  func();
  setInterval(func,delay);
}

function updateCollectionServers(elementId, offset = 0){
  var count = Object.keys(collectionServers).length - $(".skt-collection-info-txt").find(".checked").length + offset;

  $("#"+elementId).html(count + " / " + Object.keys(collectionServers).length);
  $("#"+elementId).removeClass("btn-status-cri btn-status-maj btn-status-min btn-status-green collection-alert-on");
  if(count) $("#"+elementId).addClass("btn-status-cri collection-alert-on");
  else $("#"+elementId).addClass("btn-status-green");
}

/** 2019.06.17 AJAX function updates Data Receipt Result from servers -JJ- */
function ajaxUpdateRecvInfobyId(site, elementId){

  $.ajax({
    url: "/api/v1/collection",
    type: "GET"
  })
  .done(function(data){
    var json = JSON.parse(data);
    var serverId = json.result.not_aval_json.serverId;
    var serverName = json.result.not_aval_json.serverName;
    var serverSite = json.result.not_aval_json.serverSite;
    var serverTime = json.result.not_aval_json.serverTime;
    var serverFloor = json.result.not_aval_json.serverFloor;
    var loc = json.result.not_aval_json.serverSite;
    var countAllFlag = site == "map"? true : false;
    var collectionServersNew = {};

    for(var index in serverId){
      collectionServersNew[serverId[index]] = false;
    }

    for(var id in collectionServers){
      if(!(id in collectionServersNew)){
        delete collectionServers[id];
        $("#sktCollectionModal").find(".skt-collection-modal-item-"+id).remove();
      }
    }

    for(var index in serverId){
      if(countAllFlag || loc[index].toLowerCase() == site){
        if(!(serverId[index] in collectionServers)){
          collectionServers[serverId[index]] = false;
          $("#sktCollectionModal").find(".skt-modal-name-container").append("<p class='skt-smr-modal-txt " +
          "skt-collection-modal-item-"+serverId[index]+"'>"+serverSite[index]+"</p>");
          $("#sktCollectionModal").find(".skt-modal-floor-container").append("<p class='skt-smr-modal-txt " +
          "skt-collection-modal-item-"+serverId[index]+"'>"+serverFloor[index]+"</p>");
          $("#sktCollectionModal").find(".skt-modal-location-container").append("<p class='skt-smr-modal-txt " +
          "skt-collection-modal-item-"+serverId[index]+"'>"+"1"+"</p>");
          $("#sktCollectionModal").find(".skt-modal-server-container").append("<p class='skt-smr-modal-txt " +
          "skt-collection-modal-item-"+serverId[index]+"'>"+serverName[index]+"</p>");
          $("#sktCollectionModal").find(".skt-modal-last-container").append("<p class='skt-smr-modal-txt " +
          "skt-collection-modal-item-"+serverId[index]+"'>"+serverTime[index]+"</p>");
          /**
          $("#sktCollectionModal").find(".skt-modal-button-container").append("<p class='skt-smr-modal-txt " +
          "skt-collection-modal-item-"+serverId[index]+"'onclick=showDetails("+"'"+$("#inputCurrentSite").attr("val")+"'"+",'"
          +serverFloor[index]+
          "',1,'"+rack[i]+"',"+rackid[i]+","+serverId[i]+",'"+serverName[index]+"','"+tempTarget+"')><span>Click</span></p>");
          */
          var chkboxHtml = '<p class="skt-smr-modal-txt skt-collection-modal-item-'+serverId[index]+
          '"><label class="skt-collection-info-txt"><input class="skt-collection-chk-box '+
          'skt-modal-chk-box" type="checkbox" name="chks" value="'+serverId[index]+'"/></label></p>';
          $("#sktCollectionModal").find(".skt-modal-mask-container").append(chkboxHtml);
        }
      }
    }

    $(".skt-collection-chk-box").unbind();

    /** Checkbox initialization */
    $(".skt-collection-chk-box").iCheck({
      checkboxClass: "icheckbox_polaris",
      radioClass: "iradio_polaris",
    });
    chkboxLoaded = true;

    $(".skt-collection-chk-box").on("ifChecked", function(event){
      updateCollectionServers(elementId, -1);
    });
    $(".skt-collection-chk-box").on("ifUnchecked", function(event){
      updateCollectionServers(elementId, 1);
    })

    updateCollectionServers(elementId);
  });
}

function maskAllCollections(){
  $(".skt-collection-chk-box").iCheck("check");
  updateCollectionServers("data-rcv-info");
}

function unMaskAllCollections(){
  $(".skt-collection-chk-box").iCheck("uncheck");
  updateCollectionServers("data-rcv-info");
}

/** Alarm mute on and off event */
function muteAndUnmute(){
  if($("#vol-mute-btn").attr("data-mute") == "no"){
    $("#vol-mute-btn").attr("data-mute", "yes");
    $("#vol-mute-btn").find(".mute-on-off").show();
  }
  else if($("#vol-mute-btn").attr("data-mute") == "yes"){
    $("#vol-mute-btn").attr("data-mute", "no");
    $("#vol-mute-btn").find(".mute-on-off").hide();
  }
}

(function($){
  const _PERIOD_ = 1000*60;

  /** Initialize on modal -JJ- */
  var places = {
    site : [],
    siteId : [],
    floor : [],
    number : []
  };
  var centers = ["전국 View", "둔산 국사", "성수 국사"];
  var centersUrl = ["/", "/dunsan", "/sungsu"];

  if($("#inputCurrentSite").attr("val") == "dunsan"){
    places = {
      name : "둔산 국사",
      site : ["둔산 구사옥", "둔산 구사옥", "둔산 구사옥", "둔산 신사옥"],
      siteId: ["dunsan", "dunsan", "dunsan", "dunsan"],
      floor : ["2", "4", "5", "7"],
      number : ["1", "1", "1", "1"]
    };
  }
  else if($("#inputCurrentSite").attr("val") == "sungsu"){
    places = {
      name : "성수 국사",
      site : ["성수 사옥", "성수 사옥", "성수 사옥", "성수 사옥", "성수 사옥", "성수 사옥", "성수 사옥","성수 사옥"],
      siteId: ["sungsu", "sungsu", "sungsu", "sungsu", "sungsu", "sungsu", "sungsu","sungsu"],
      floor : ["3","5","6_MAIN","6_NEW", "8", "SUYU_2","SUYU_5","SUYU_6"],
      number : ["1", "1", "1", "1", "1", "1", "1","1"]
    };
  }
  else if($("#inputCurrentSite").attr("val") == "bundang"){
    places = {
      name : "분당 국사",
      site : ["분당 사옥", "분당 사옥"],
      siteId: ["bundang", "bundang"],
      floor : ["3", "4"],
      number : ["1", "1"]
    };
  }
  else if($("#inputCurrentSite").attr("val") == "boramae"){
    places = {
      name : "보라매 국사",
      site : ["보라매 사옥", "보라매 사옥", "보라매 사옥", "보라매 사옥"],
      siteId: ["boramae", "boramae", "boramae", "boramae"],
      floor : ["B1_1", "B1_2", "B1_3", "B1_4"],
      number : ["1", "1", "1", "1"]
    };
  }
  else if($("#inputCurrentSite").attr("val") == "map"){
    places = {
      name : "전국 View",
      site : ["둔산 구사옥", "둔산 구사옥", "둔산 구사옥", "둔산 신사옥",
              "성수 사옥", "성수 사옥", "성수 사옥", "성수 사옥", "성수 사옥", "성수 사옥", "성수 사옥"],
      siteId: ["dunsan", "dunsan", "dunsan", "dunsan",
              "sungsu", "sungsu", "sungsu", "sungsu", "sungsu", "sungsu", "sungsu"],
      floor : ["2", "4", "5", "7",
              "3", "4", "5", "6_MAIN", "6_NEW", "7", "8"],
      number : ["1", "1", "1", "1","1", "1", "1", "1", "1", "1", "1"]
    };
  }

  places.site.forEach(function(e,index){
    $("#sktSimulModal").find(".skt-modal-name-container").append("<p class='skt-smr-modal-txt'>"+places.site[index]+"</p>");
    $("#sktSimulModal").find(".skt-modal-floor-container").append("<p class='skt-smr-modal-txt'>"+places.floor[index]+"</p>");
    $("#sktSimulModal").find(".skt-modal-location-container").append("<p class='skt-smr-modal-txt'>"+places.number[index]+"</p>");
    $("#sktSimulModal").find(".skt-modal-button-container").append("<p class='skt-smr-modal-button'"+
      " onclick=showCenter("+"'"+places.siteId[index]+"'"+",'"+places.floor[index]+
      "',"+places.number[index]+")><span>Click</span></p>");
      $("#sktViewModal").find(".skt-modal-name-container").append("<p class='skt-smr-modal-txt'>"+places.site[index]+"</p>");
      $("#sktViewModal").find(".skt-modal-floor-container").append("<p class='skt-smr-modal-txt'>"+places.floor[index]+"</p>");
      $("#sktViewModal").find(".skt-modal-location-container").append("<p class='skt-smr-modal-txt'>"+places.number[index]+"</p>");
      $("#sktViewModal").find(".skt-modal-button-container").append("<p class='skt-smr-modal-button'"+
        " onclick=showDetails("+"'"+places.siteId[index]+"'"+",'"+places.floor[index]+
        "',"+places.number[index]+")><span>Click</span></p>");
  });
  $("#selectedTeamNameSpan").text(places.name);

  centers.forEach(function(e,index){
    var addHtml = '<li><a href="'+centersUrl[index]+'">'+e+'</a></li>';
    $("#dropdown-centers").append(addHtml);
  });

  /** Periodically Update Data Receive Info from servers */
  executeSetInterval(function(){
    //ajaxUpdateRecvInfobyId($("#inputCurrentSite").attr("val"), "data-rcv-info");
  }, _PERIOD_);

  /** Alarm sound */
  var audio = new Audio("/files/alert_sound.mp3");

  /** Initialization : Sound Alarm Mute Level Checkboxes */
  $(".skt-alarm-mute-chk-box").iCheck({
    checkboxClass: "icheckbox_polaris",
    radioClass: "iradio_polaris",
  })
  $(".skt-alarm-mute-chk-box").on("ifChecked", function(e){
    $(e.target).attr("value","on");
  });
  $(".skt-alarm-mute-chk-box").on("ifUnchecked", function(e){
    $(e.target).attr("value","off");
  });

  /** Initialization : Alarm sound mute level setting */
  $("#dropdown-mute-levels").click(function(e){
    $("#selectedMuteLevel").text(e.target.innerText.replace("만 Sound On",""));
  })

  executeSetInterval(function(){
    /** count : non-collected items */
    var count = $(".collection-alert-on").length;
    
    /** countMin ~ countCri : Temperature alert items */
    var countMin = $(".min-alert-on").length;
    var countMaj = $(".maj-alert-on").length;
    var countCri = $(".cri-alert-on").length;

    /** countCoolerMin ~ countCoolerCri : Cooler alert items */
    var countCoolerCri = $(".cooler-cri-alert-on").length;

    var flag = false;

    if(count>0 && $("input[name=collection-mute-cri-chk-box]").attr("value")=="on") flag = true;
    if(countMin>0 && $("input[name=temp-mute-minor-chk-box").attr("value")=="on") flag = true;
    if(countMaj>0 && $("input[name=temp-mute-major-chk-box").attr("value")=="on") flag = true;
    if(countCri>0 && $("input[name=temp-mute-cri-chk-box").attr("value")=="on") flag = true;
    if(countCoolerCri>0 && $("input[name=cooler-mute-cri-chk-box").attr("value")=="on") flag = true;

    if(flag) audio.play();
    else{
      audio.pause();
      audio.currentTime = 0;
    }

    /** Alarm Mute Renewal - 2020.01.02 */
    /** 
    if(count>0 && $("#vol-mute-btn").attr("data-mute")=="no"){
      audio.play();
    }
    else if($("#selectedMuteLevel").text() == "Critical이상" && countCri >0
            && $("#vol-mute-btn").attr("data-mute")=="no"){
      audio.play();
    }
    else if($("#selectedMuteLevel").text() == "Major이상" && (countCri > 0 || countMaj > 0)
            && $("#vol-mute-btn").attr("data-mute")=="no"){
      audio.play();
    }
    else if($("#selectedMuteLevel").text() == "Minor이상" && (countCri > 0 || countMaj > 0 || countMin > 0)
            && $("#vol-mute-btn").attr("data-mute")=="no"){
      audio.play();
    }
    else{
      audio.pause();
      audio.currentTime = 0;
    }
    */
  }, 1000);

  /** Apply scrollbar to modals */
  $(".modal-dialog").mCustomScrollbar({
    autoHideScrollbar: false,
    scrollbarPosition: "inside",
    theme:"light-1"
  });

})(jQuery);
