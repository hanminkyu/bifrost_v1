function getDateTime(){
    var date = new Date();
	let day = ("0" + date.getDate()).slice(-2);
	let month = ("0" + (date.getMonth() + 1)).slice(-2);
	let year = date.getFullYear();
	let hours = date.getHours();
	let minutes = date.getMinutes();
	let seconds = date.getSeconds();
	
	return (year + "-" + month + "-" + day + " " + hours + ":" + minutes + ":" + seconds);
}

function getPrevDateTime(){
	let PrevTime = new Date();
	PrevTime.setMinutes(PrevTime.getMinutes()-5);
	
	let date = ("0" + PrevTime.getDate()).slice(-2);
	let month = ("0" + (PrevTime.getMonth() + 1)).slice(-2);
	let year = PrevTime.getFullYear();
	let hours = PrevTime.getHours();
	let minutes = PrevTime.getMinutes();
	let seconds = PrevTime.getSeconds();
	
	return (year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds);
}


function executeSetInterval(func, delay){
  func();
  setInterval(func,delay);
}

function drawPieChart(data1, data2, elementId){
	var config = {
    		type: 'doughnut',
            data: {
              labels: ["Remain","Using"],
              datasets: [
                {
                  //label: "Population (millions)",
                  backgroundColor: ["#3cba9f","#c45850"],
                  data: [data2-data1, data1]
                }
              ]
            },
            options: {
              //responsive: true,
              legend: {		
            	 position: 'mid',
              },
              title: {
                display: true,
                text: (100-(data1/data2*100)).toFixed(2)+"%"
              }
            }
    }
	new Chart($("."+elementId), config);
}

/** 2020.03.10 Ajax Function Updates System detail status -MK- */
function ajaxShowHssDetail(url){
  $.ajax({
    url: url,
    type: "GET"
  })
  .done(function(data){
	var sys_num = $("#inputCurrentSystem").attr("val");
	var json = JSON.parse(data);
	
	//fallback(0)
	var system_namef0 = json.result[0].system_name;
	var building = json.result[0].building;
	var floor_plan = json.result[0].floor_plan;
    var curTps = json.result[0].curTps;
    var totTps = json.result[0].totTps;
	
	//fallback(1)
	var system_namef1 = json.result[1].system_name;
	var system_typef1 = json.result[1].system_type;
    var date = json.result[1].date;
    var time = json.result[1].time;
	var type = json.result[1].type;
	var succ_rate = json.result[1].succ_rate;
	var att = json.result[1].att;
	
	//fallback(2)
    var system_name_f2 = json.result[2].system_name;
    var date_f2 = json.result[2].date;
    var time_f2 = json.result[2].time;
    var sys_sub_name_f2 = json.result[2].sys_sub_name;
    var type_f2 = json.result[2].type;
    var code_f2 = json.result[2].code;
    
    //fallback(3) - 임계치 정보
    var system_f3 = json.result[3].system;
    var th0 = json.result[3].th0; // UAR 성공율 임계치
    var th1 = json.result[3].th1; // MAR 성공율 임계치
    var th2 = json.result[3].th2; // SAR 성공율 임계치
    var th3 = json.result[3].th3; // LIR 성공율 임계치
    var th4 = json.result[3].th4; // UAR 시도호 임계치
    var th5 = json.result[3].th5; // MAR 시도호 임계치
    var th6 = json.result[3].th6; // SAR 시도호 임계치
    var th7 = json.result[3].th7; // LIR 시도호 임계치
    
    var A_th0, A_th1, A_th2, A_th3, A_th4, A_th5, A_th6, A_th7; //Active
    var S_th0, S_th1, S_th2, S_th3, S_th4, S_th5, S_th6, S_th7; //Standby
    var BK_th0, BK_th1, BK_th2, BK_th3, BK_th4, BK_th5, BK_th6, BK_th7; //BKUP
    
    system_f3.forEach(function(e,index){
    	if(system_f3[index] == "AHSS"){
    		A_th0 = th0[index];
    		A_th1 = th1[index];
    		A_th2 = th2[index];
    		A_th3 = th3[index];
    		A_th4 = th4[index];
    		A_th5 = th5[index];
    		A_th6 = th6[index];
    		A_th7 = th7[index];
    	}
    	else if(system_f3[index] == "SHSS"){
    		S_th0 = th0[index];
    		S_th1 = th1[index];
    		S_th2 = th2[index];
    		S_th3 = th3[index];
    		S_th4 = th4[index];
    		S_th5 = th5[index];
    		S_th6 = th6[index];
    		S_th7 = th7[index];
    	}
    	else if(system_f3[index] == "BKHSS"){
    		BK_th0 = th0[index];
    		BK_th1 = th1[index];
    		BK_th2 = th2[index];
    		BK_th3 = th3[index];
    		BK_th4 = th4[index];
    		BK_th5 = th5[index];
    		BK_th6 = th6[index];
    		BK_th7 = th7[index];
    	}
    });

	$(".hss-container").find(".sys-txt-value").remove(); 
	$(".hss-stat-panel").removeClass("alarm-twinkle");

	//fallback(0)
	system_namef0.forEach(function(e,index) {
		if(system_namef0[index]==sys_num){
			building = building[index];
			floor_plan = floor_plan[index];  
			curTps = curTps[index];
			totTps = totTps[index];
			
			var locationAddHtml = "<span class='sys-txt-value'>"+building+" "+floor_plan+ "</span>"; 
		    var curTpsAddHtml = "<span class='sys-txt-value'>"+curTps+"</span>";
		    var totTpsAddHtml = "<span class='sys-txt-value'>"+totTps+"</span>";
		    
		    $("#locationContainer").append(locationAddHtml);
		    $("#curHSSTpsContainer").append(curTpsAddHtml);
		    $("#totHSSTpsContainer").append(totTpsAddHtml);
		    
		}
	});
	
	drawPieChart(curTps, totTps, "hss-chart"); 
	
	//fallback(1)
	
	//fallback(1, 3)
	//통계 임계치 설정 및 통계 출력
	var s_format_HSS_UAR= "<div class=\"col-sm-10 hss-stat-panel\">"+
	"<div id=\"UARstat\" class=\"hss-stat-txt\">UAR 성공률 </div></div>";
	
	var s_format_HSS_MAR= "<div class=\"col-sm-10 hss-stat-panel\">"+
    "<div id=\"MARstat\" class=\"hss-stat-txt\">MAR 성공률 </div></div>";

	var s_format_HSS_SAR= "<div class=\"col-sm-10 hss-stat-panel\">" + 
    "<div id=\"SARstat\" class=\"hss-stat-txt\">SAR 성공률 </div></div>";

	var s_format_HSS_LIR= "<div class=\"col-sm-10 hss-stat-panel\">" + 
    "<div id=\"LIRstat\" class=\"hss-stat-txt\">LIR CCR 성공률 </div></div>";
	
	var a_format_HSS= "<div id=\"A1251\" class=\"col-sm-10 hss-stat-panel\">"+
	"<div class=\"hss-stat-txt\">PROCESS CPU USAGE ALARM</div></div>"+
    "<div id=\"A2010\" class=\"col-sm-10 hss-stat-panel\">"+
    "<div class=\"hss-stat-txt\">MP PROCESS ABNORMAL ALARM</div></div>" +
    "<div id=\"A6002\" class=\"col-sm-10 hss-stat-panel\">" + 
    "<div class=\"hss-stat-txt\">DIAMETER CSCF CONNECTION ABNORMAL ALARM</div></div>";
	
	
	$(".hss-container").find(".col-sm-10").remove();
	
	
	system_namef1.forEach(function(e,index) {
		if(system_namef1[index] == sys_num ){
			if( getPrevDateTime() < date[index]+" "+time[index] && getDateTime() > date[index]+" "+time[index]){
				if(system_typef1[index] == "A"){
					console.log("시스템명 : "+system_namef1[index]);
					switch(type[index]){
						case "UAR" : 
							$(".stat-panel").append(s_format_HSS_UAR);
							$(".alarm-panel").append(a_format_HSS);
							$("#UARstat").append("<span class='sys-txt-value'>"+succ_rate[index]+"%</span>");
							if(succ_rate[index] < A_th0 && att[index] > A_th4)
						      	  $("#UARstat").parents(".hss-stat-panel").addClass("alarm-twinkle");
							break;
						case "MAR" : 
							$(".stat-panel").append(s_format_HSS_MAR);
							$("#MARstat").append("<span class='sys-txt-value'>"+succ_rate[index]+"%</span>");
							if(succ_rate[index] < A_th1 && att[index] > A_th5)
						      	  $("#MARstat").parents(".hss-stat-panel").addClass("alarm-twinkle");
							break;
						case "SAR" : 
							$(".stat-panel").append(s_format_HSS_SAR);
							$("#SARstat").append("<span class='sys-txt-value'>"+succ_rate[index]+"%</span>");
							if(succ_rate[index] < A_th2 && att[index] > A_th6)
						      	  $("#SARstat").parents(".hss-stat-panel").addClass("alarm-twinkle");
							break;
						case "LIR" : 
							$(".stat-panel").append(s_format_HSS_LIR);
							$("#LIRstat").append("<span class='sys-txt-value'>"+succ_rate[index]+"%</span>");
							if(succ_rate[index] < A_th3 && att[index] > A_th7)
						      	  $("#LIRstat").parents(".hss-stat-panel").addClass("alarm-twinkle");
							break;
					}
				}
				else if(system_typef1[index] == "S"){
					switch(type[index]){
					case "UAR" : 
						$(".stat-panel").append(s_format_HSS_UAR);
						$(".alarm-panel").append(a_format_HSS);
						$("#UARstat").append("<span class='sys-txt-value'>"+succ_rate[index]+"%</span>");
						if(succ_rate[index] < S_th0 && att[index] > S_th4)
					      	  $("#UARstat").parents(".hss-stat-panel").addClass("alarm-twinkle");
						break;
					case "MAR" : 
						$(".stat-panel").append(s_format_HSS_MAR);
						$("#MARstat").append("<span class='sys-txt-value'>"+succ_rate[index]+"%</span>");
						if(succ_rate[index] < S_th1 && att[index] > S_th5)
					      	  $("#MARstat").parents(".hss-stat-panel").addClass("alarm-twinkle");
						break;
					case "SAR" : 
						$(".stat-panel").append(s_format_HSS_SAR);
						$("#SARstat").append("<span class='sys-txt-value'>"+succ_rate[index]+"%</span>");
						if(succ_rate[index] < S_th2 && att[index] > S_th6)
					      	  $("#SARstat").parents(".hss-stat-panel").addClass("alarm-twinkle");
						break;
					case "LIR" : 
						$(".stat-panel").append(s_format_HSS_LIR);
						$("#LIRstat").append("<span class='sys-txt-value'>"+succ_rate[index]+"%</span>");
						if(succ_rate[index] < S_th3 && att[index] > S_th7)
					      	  $("#LIRstat").parents(".hss-stat-panel").addClass("alarm-twinkle");
						break;
					}
				}
				else if(system_typef1[index] == "BK"){
					switch(type[index]){
					case "UAR" : 
						$(".stat-panel").append(s_format_HSS_UAR);
						$(".alarm-panel").append(a_format_HSS);
						$("#UARstat").append("<span class='sys-txt-value'>"+succ_rate[index]+"%</span>");
						if(succ_rate[index] < BK_th0 && att[index] > BK_th4)
					      	  $("#UARstat").parents(".hss-stat-panel").addClass("alarm-twinkle");
						break;
					case "MAR" : 
						$(".stat-panel").append(s_format_HSS_MAR);
						$("#MARstat").append("<span class='sys-txt-value'>"+succ_rate[index]+"%</span>");
						if(succ_rate[index] < BK_th1 && att[index] > BK_th5)
					      	  $("#MARstat").parents(".hss-stat-panel").addClass("alarm-twinkle");
						break;
					case "SAR" : 
						$(".stat-panel").append(s_format_HSS_SAR);
						$("#SARstat").append("<span class='sys-txt-value'>"+succ_rate[index]+"%</span>");
						if(succ_rate[index] < BK_th2 && att[index] > BK_th6)
					      	  $("#SARstat").parents(".hss-stat-panel").addClass("alarm-twinkle");
						break;
					case "LIR" : 
						$(".stat-panel").append(s_format_HSS_LIR);
						$("#LIRstat").append("<span class='sys-txt-value'>"+succ_rate[index]+"%</span>");
						if(succ_rate[index] < BK_th3 && att[index] > BK_th7)
					      	  $("#LIRstat").parents(".hss-stat-panel").addClass("alarm-twinkle");
						break;
					}
				}
			}
		}
	});
	//fallback(2) -- 알람 ON 조건 
	system_name_f2.forEach(function(e,index) {
		if(system_name_f2[index] == sys_num ){
			if(type_f2[index] == "ALARM"){
				switch(code_f2[index]){
					case "A1251":
						$("#A1251").addClass("alarm-twinkle");
						break;
					case "A2010":
						$("#A2010").addClass("alarm-twinkle");
						break;
					case "A6002":
						$("#A6002").addClass("alarm-twinkle");
						break;
				}
			}
		}
	});
	
	type_f2.forEach(function(e,index) { // Clear 조건
		if(type_f2[index] == "CLEAR" ){
			for(var i=0; i<type_f2.length; i++){
				if(type_f2[i] == "ALARM" && sys_sub_name_f2[index] == sys_sub_name_f2[i] && date[index]+" "+time[index] > date[i]+" "+time[i]){ 
					switch(code_f2[index]){
						case "A1251":
							$("#A1251").removeClass("alarm-twinkle");
							break;
						case "A2010":
							$("#A2010").removeClass("alarm-twinkle");
							break;
						case "A6002":
							$("#A6002").removeClass("alarm-twinkle");
							break;
					}
				}
			}
		}
	});
  });
 }

(function($){
  "use strict";
  
  const _PERIOD_ = 1000*60;
  
  executeSetInterval(function(){
      ajaxShowHssDetail("/api/v1/hss-list/"+$("#inputCurrentSystem").attr("val"));
    }, _PERIOD_);
  
})(jQuery);