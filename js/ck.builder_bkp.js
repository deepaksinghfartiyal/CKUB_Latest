// temporary deeplink boolean. change to hash or qs or whatevs.
var deeplink = false;

var Product = {
	"id": null,
	"category": null,
	"fabricOptions": [],
	"panels": [],
	"colorOptions": {},
	"colorSwatches": null,
	"patternOptions": [],
	"printingOptions": null,
	"textColors": [],
	"minQuantity": null,
	"views": [],
	"sizes": []
}

var Cust = {
	"step": null,
	"fabric": null,
	"colors": {},
	"swatch": null,
	"pattern": null,
	"patternColors": [],
	"text": [],
	"stockLogos": [],
	"uploads": [],
	"notes": null
}

var Quantity = {}

var Builder = {
	viewOnly: false,
	frontOnly: false,
	id: null,	//design id
	guid: null,
	step: 0,
	maxStep: 4,
	STEPS: ['fabric', 'color', 'content', 'sizing', 'review'],
	VIEWS: ['_Front', '_Back', '_Left', '_Right'],
	viewsToLoad: 0,
	viewsLoaded: 0,
	swatchMode: false,
	patternsDisplayed: false,
	init: function() {
		if (deeplink || $.QueryString['deep']) {
			$('body').addClass("view-only");
			Builder.viewOnly = true;
		}
		if ($.QueryString['f']) {
			$('body').addClass("view-only");
			$('body').addClass("front-only");
			Builder.viewOnly = true;
			Builder.frontOnly = true;
		}
		Builder.guid = $.QueryString['design'];
		Builder.loadDesign();
	},
	loadDesign: function() {
		Api.call(Api.endpoints.getDesign, {
			guid: Builder.guid
		}, function(data) {
			Builder.initViewModel(data);
			Builder.displayProduct();
		});
	},
	initViewModel: function(data) {
		Builder.id = data.id;
		Product = data.product;
		Cust = data.customization;
		Quantity = data.quantities;
		
		if (Product.colorSwatches) Builder.swatchMode = true;
	},
	productDataForSaving: function() {
		return {
			id: Builder.id,
			productID: Product.id,
			category: Product.category,
			customization: Cust,
			quantities: Quantity
		}
	},
	initUi: function() {
		CK.log('initUi');
		$("[data-nav]").bind('click', function(e) {
			e.preventDefault();
			var val = $(this).data('nav');
			var newStep = val == "next" ? Builder.step+1 : (val == "prev" ? Builder.step-1 : val);
			
			var keepGoing = true;
			for (var i = Builder.step; i < newStep; i++) {
				if (!Builder.validateStep(i)) {
					Builder.gotoStep(i);
					Builder.validateStep(i, true)
					keepGoing = false;
					break;
				}
			}
			
			if (keepGoing) // if moving forward, validate the step first
				Builder.gotoStep(newStep);
		})

		$('body').on('click', '[data-nav]', function() {
			Api.call(Api.endpoints.saveDesign, 
			Builder.productDataForSaving(),
			Builder.acknowledgeSaveQuietly);
		});
		
		$('body').on('click', '[data-save]', function() {
			Api.call(Api.endpoints.saveDesign, 
			Builder.productDataForSaving(),
			Builder.acknowledgeSave);
		});
		
		$('body').on('click', '.modal .close', function(e){
			e.preventDefault();
			$(".modal, .modal-bknd").removeClass("active");
		});

		$(".option-set.sizing input").change(Builder.updatePricing);

		$(".review-ui .buttons input.to-dealer").bind('click', function(e){
			e.preventDefault();
			$(".modal.dealer, .modal-bknd").addClass("active");
		});

		$(".preview-nav a").bind('click', function(e){
			e.preventDefault();
			var position = $(this).data('view');
			$(".preview div[data-view]").removeClass("active");
			$(".preview div[data-view="+position+"]").addClass("active");
			$(".preview-nav a").removeClass("active");
			$(this).addClass("active");
		});

		/*$(".add-image").click(function(){
			Builder.addImage();
		});*/

		$(".option-set.cuff .pattern").bind('click', function(e){
			e.preventDefault();
			$(".option-set.cuff .pattern").removeClass("active");
			$(this).addClass("active");

			// set the pattern in svg
			// reset colors?
			// display colors associated with pattern
		});
		
		$(".zoom").click(function(e){
			e.preventDefault();
			var html = '';
			var count = 0;
			$(".canvas-wrapper").each(function(e){
				html += "<div class='view'>"+$(this).children(".svg").html()+"</div>";
			});

			$(".modal.expand .content").html(html);
			$(".modal.expand, .modal-bknd").addClass('active');
		});

		$(".option-set.review h3").click(function(){
			$(this).parent().toggleClass("active");
		})
		
		$(".button.custom-browse").bind('click', function(e){
			e.preventDefault();
			$("input.add-image").click();
		})

		$(".button.stock-logos").bind('click', function(e){
			e.preventDefault();
			if(!$(".modal.stock-logos").hasClass("loaded")){
				$(".modal.stock-logos .logos ul li").each(function(){
					var file = $(this).data('svg');
					Builder.loadStockLogoSvg(file, $(this).attr("id"));
				});
				$(".modal.stock-logos").addClass("loaded");
			}
			$(".modal.stock-logos, .modal-bknd").addClass("active");

		});

		$(".modal.stock-logos .buttons .tab").bind('click', function(e){
			var id = $(this).attr("id");
			$(".logos ul").removeClass("active");
			$("ul."+id).addClass("active");
			$(".modal.stock-logos .buttons .button").addClass("light");
			$(this).removeClass("light");
		});

		$(".logos ul li").click(function(e){
			e.preventDefault();
			var svg = $(this).children("div").html();//.children("svg")
			$(".modal.stock-logos .close").trigger('click');
			svgText.addSVGLogo(svg);
		})

		// leave this at the bottom
		$(".button.disabled").click(function(e){e.preventDefault();return false;});
	},
	initStepUi: function() {
		CK.log('initStepUi', Builder.step);
		$.each(Builder.STEPS, function( index, value ) {
		  $('body').removeClass(value);
		});
		$('body').addClass(Builder.STEPS[Builder.step]);
		
		switch(Builder.step) {
			case 0:	//fabric
			break;
			case 1:	//color
				Builder.displayProductColors();
				Builder.populateColorsWithCustomization();
				if (Product.patternOptions.length == 0)
					$(".option-set.patterns").hide();
			break;
			case 2:	//content
				//svgText.init();
			break;
			case 3:	//sizing
			break;
			case 4:	//review
				Builder.compileReview();
			break;
			default:
			break;
		}
	},
	validateStep: function(step, hideAlerts) {
		CK.log('validateStep', step);
		switch(step) {
			case 0:	//fabric
				var fabricIsChosen = false;
				$(".fabric-opt").each(function() {
					if ($(this).hasClass("active"))
						fabricIsChosen = true;
				});
				if (!fabricIsChosen) !hideAlerts && CK.alert(103);
				return fabricIsChosen;
			break;
			case 1:	//color
				// make sure all colors are selected
				var groupCount = $(".option-set.color .group").length;
				groupCount += $(".option-set.patterns .group").length;
				var colorCount = 0;
				$(".option-set.color .group").each(function(){
					if ($(this).children('ul').children("li.active").length > 0)
						colorCount++;
					else
						$(this).addClass("error");
				});
				$(".option-set.patterns .group").each(function(){
					if ($(this).children('ul').children("li.active").length > 0)
						colorCount++;
					else
						$(this).addClass("error");
				});
				if (colorCount != groupCount) {
					!hideAlerts && CK.alert(104);
					return false;
				}
				return true;
			break;
			case 2:	//text
				// check bounding boxes
				return true;
			break;
			case 3:	//sizing
				// make sure quantity is >= min quanitity
				var total_quantity = 0;
				$(".option-set.sizing input").each(function(){
					total_quantity += Number($(this).val());
				});
				if(total_quantity < Product.minQuantity){
					!hideAlerts && CK.alert(101);
					return false;
				}

				Cust.notes = $("#notes").text();

				return true;
			break;
			case 4:	//review
				// no validation
				return true;
			break;
			default:
				return false;
			break;
		}
	},
	gotoStep: function(step) {
		CK.log('gotoStep', step);
		if (step <= Builder.maxStep && step >= 0) {
			if (step == 0)
				$("[data-nav=prev]").addClass("disabled");
			else if (step == Builder.maxStep)
				$("[data-nav=prev]").removeClass("disabled");
			else
				$("[data-nav]").removeClass("disabled");
			
			$(".option-set.active, [data-nav]").removeClass("active")
			$(".option-set[data-step="+step+"]").addClass("active");
			$("[data-nav="+step+"]").addClass("active");
			
			Builder.step = step;
			Cust.step = step;
			Builder.initStepUi();
		}
	},
	initSVGDrag: function() {
		$("svg image").mousedown(function(e){
			$(this).attr("data-cx", $(this).attr("x"));
			$(this).attr("data-cy", $(this).attr("y"));
			$(this).attr("data-zero-x", e.pageX);
			$(this).attr("data-zero-y", e.pageY);
			$(this).attr("data-dragme", "true");
		}).mouseup(function(){
			$(this).attr("data-dragme", "false");
		}).mousemove(function(e){
			if($(this).attr("data-dragme") == "true"){
				var mx = e.pageX;
				var my = e.pageY;

				var xpos = Number($(this).attr("data-cx"))+(mx-Number($(this).attr("data-zero-x")));
				var ypos = Number($(this).attr("data-cy"))+(my-Number($(this).attr("data-zero-y")));

				$(this).attr("x", xpos);
				$(this).attr("y", ypos);
			}
		});
	},
	checkLoadProgress: function(type) {
		CK.log('checkLoadProgress', Builder.viewsLoaded, Builder.viewsToLoad);
		if(type == "view"){
			if (Builder.viewsLoaded >= Builder.viewsToLoad) {			
				Builder.displayProductColors();
				Builder.populateColorsWithCustomization();
				Builder.initPatterns();
				$('body').addClass('loaded');
			}
		}else if(type == "logo"){
			var cloneLogos = true;
			$(".logos ul li").each(function(){
				if(!$(this).hasClass("loaded")){
					cloneLogos = false;
				}
			});
			if(cloneLogos){
				$(".logos ul.one-color li").clone().appendTo("ul.two-color");
				$(".logos ul.one-color li").clone().appendTo("ul.three-color");
			}
			
		}
	},
	loadGarmentSvg: function(view) {
		CK.log('loadGarmentSvg', view);
		$.get( "/svg/" + Product.sku + view + ".svg", function( data ) {
			var svg = $(data).children("svg");
			$("g[id]", svg).each(function(){
				$(this).attr("id", ($(this).attr("id")+view));

				$("path", $(this)).each(function(){
					$(this).attr("data-orig-fill", $(this).attr("fill"));
				});

				
			});

			var mask_svg = $("g[id^='BODY']", svg);
			var overlay_svg = $("g[id^='OVERLAY']", svg);

			$(".preview .overlays div[data-view="+view+"]").html('<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 360 756" enable-background="new 0 0 360 756" xml:space="preserve">'+overlay_svg.html()+"</svg>");

			$(".svg-masks").append('<svg height="0" width="0"><defs><clipPath id="mask'+view+'">'+mask_svg.html()+'</clipPath></defs></svg>');

			$(".canvas-wrapper[data-view="+view+"] .svg").html(svg);

			if(!$(".option-set.content").hasClass("SVGTextReady")) {
				$("#editable_area_Front").html('<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 360 756" enable-background="new 0 0 360 756" xml:space="preserve" clip-path="url(#mask_Front)"><g id="svg_text_holder_Front" width="360" height="756"></g></svg>');
				$("#editable_area_Back svg").html('<g id="svg_text_holder_Back" width="360" height="756" clip-path="url(#mask_Back)"></g>');
				$("#editable_area_Left svg").html('<g id="svg_text_holder_Left" width="360" height="756" clip-path="url(#mask_Left)"></g>');
				$("#editable_area_Right svg").html('<g id="svg_text_holder_Right" width="360" height="756" clip-path="url(#mask_Right)"></g>');

				svgText.init();
			}

			$(".preview-nav a[data-view="+view+"]").html('<img src="/svg/thumbs/'+Product.sku+'/'+Product.sku+"_thumb"+view+'.png" />');
			
			overlay_svg.remove();
			Builder.viewsLoaded++;
			Builder.checkLoadProgress("view");
		});
	},
	loadStockLogoSvg: function(file_ref, group){
		$.get( "/svg/stock_logos/" + file_ref + ".svg", function( data ) {
			var svg = $(data).children("svg");

			if(group == "one-color"){
				// fill only
			}else if(group == "two-color"){
				// fill and outline
			}else{
				// fill, outline and detail
			}
			$("li[data-svg='"+file_ref+"']").addClass("loaded").children("div").html(svg);
			
			Builder.checkLoadProgress("logo");
		});
	},
	setSvgColor: function(group, hex) {
		//applies to all 4 views using Rob's magic ^
	    if (hex != null)
			$("g[id^="+group+"] path").attr("fill", "#"+ hex);
	},
	resetGarmentSvg: function(){
		$("svg path[data-orig-fill]").each(function(){
			$(this).attr("fill", $(this).attr("data-orig-fill"));
		});
	},
	displayProduct: function() {
		CK.log('displayProduct');
		$(".product-title").text(Product.sku);

		// fabrics
		$('.option-set.fabric').empty();
		$(Product.fabricOptions).each(function() {
			var html = '<div class="fabric-opt" data-fabric-id="'+this.id+'">';
			html += "<strong>"+this.name+"</strong>";
			html += "<p>"+this.description+"</p>";
			html += '</div>';
			
			$('.option-set.fabric').append($(html));
		});
		$('.option-set.fabric').on('click', '[data-fabric-id]:not(.active)', function() {
			var $fabric = $(this);
			CK.prompt(105, function() {
				$('[data-fabric-id]').removeClass('active');
				$fabric.addClass('active');
				Builder.resetGarmentSvg();
				
				Cust.fabric = $fabric.data('fabric-id');
				if (Builder.swatchMode) {
					Cust.swatch = null;
				}
				else {
					$.each( Cust.colors, function( key, value ) {
						Cust.colors[key] = null;
					})
				}
			});
		})
		
		//colors are done in initStepUi bc dependant on fabric
		
		// patterns
		// use Builder.initPatterns after svg is loaded

		// texts
		
		// views
		$('.preview-nav [data-view]').addClass('hide');
		if (Builder.frontOnly) {
			Builder.viewsToLoad = 1;
			$('.preview-nav [data-view]').eq(0).removeClass('hide');
			Builder.loadGarmentSvg(Builder.VIEWS[0]);
		}
		else {
			$(Product.views).each(function() {
				if (this == true)
					Builder.viewsToLoad++;
			});
			$(Product.views).each(function(e, i) {
				if (this == true) {
					$('.preview-nav [data-view]').eq(e).removeClass('hide');
					Builder.loadGarmentSvg(Builder.VIEWS[e]);
				}
			});
		}
		
		//sizing
		$('[data-min]').text(Product.minQuantity);
		$('.sizing-chart-options').empty();
		$(Product.sizes).each(function() {
			var html = '<div class="row" data-size="'+this+'">';
			html +=	'<div class="col"><strong>'+this+'</strong></div>';
			html +=	'<div class="col">:<input type="text" value="0" name="'+this+'" /></div>';
			html +=	'<div class="col per-piece">$<span>10.00</span></div>';
			html +=	'<div class="col piece-total">0.00</div>';
			html +=	'</div>';
			$('.sizing-chart-options').append($(html));
		});

		Builder.initUi();
		Builder.populateWithCustomization();
	},
	displayProductColors: function () {
	    alert('displayProductColors');
		CK.log('displayProductColors');
		$('.option-set.color').empty();
		
		if (Builder.swatchMode) { //stock garment
			var html = '<div class="group" data-svg-id=swatch">';
			html+=			'<strong>Color Options</strong>';
			html+=			'<ul>';
			html+=			'</ul>';
			html+=		'</div>';
			$('.option-set.color').append($(html));
			
			$(Product.colorSwatches[Cust.fabric]).each(function() {
				var $li = $('<li title="'+this.name+'" data-hex="'+this.hex+'" data-code="'+this.code+'"></li>').data('colors', this.colors);
				$('.option-set.color .group ul').append($li);
			});
			
			$(".option-set.color .group ul li").each(function(){
				$(this).css("background-color", "#"+$(this).data("hex"));
				$(this).click(function(e){
					var colors = $(this).data('colors');
					$(this).parent().parent().removeClass("error");
					$(this).siblings("li.active").removeClass("active");
					$(this).addClass("active");
					$(Product.panels).each(function() {
						Builder.setSvgColor(this.name, colors[this.name]['hex']);
					})
					Cust.swatch = $(this).data('code');
				});
			});
		}
		else { //fully custom colors
			$(Product.panels).each(function() {
				var panel = this;
				var html = '<div class="group" data-svg-id="'+panel.name+'">';
				html+=			'<strong>'+panel.display+' Color</strong>';
				html+=			'<ul>';
				$(Product.colorOptions[Cust.fabric][panel.name]).each(function() {
					html+=		'<li title="'+this.name+'" data-hex="'+this.hex+'" data-code="'+this.code+'"></li>';
				});
				html+=			'</ul>';
				html+=		'</div>';
				$('.option-set.color').append($(html));
			});
			$(".option-set.color .group ul li").each(function(){
				$(this).css("background-color", "#"+$(this).data("hex"));
				$(this).click(function(e){
					$(this).parent().parent().removeClass("error");
					$(this).siblings("li.active").removeClass("active");
					$(this).addClass("active");
					var group = $(this).closest(".group").data("svg-id");
					Builder.setSvgColor(group, $(this).data('hex'));
					Cust.colors[group] = $(this).data('code');
				});
			});
		}
	},
	populateWithCustomization: function() {
		CK.log('populateWithCustomization');
		
		//fabrics
		$('[data-fabric-id='+Cust.fabric+']').addClass('active');
		
		//colors are done in initStepUi bc dependant on fabric
		
		//patterns
		
		//texts
		
		//sizing
		$(Product.sizes).each(function() {
			$('.sizing-chart-options [name="'+this+'"]').val(Quantity[this]);
		});
		$("#notes").text(Cust.notes);
		Builder.updatePricing();
		
		Builder.gotoStep(Cust.step);
	},
	populateColorsWithCustomization: function() {
		CK.log('populateColorsWithCustomization');
		
		if (Builder.swatchMode) {
			if (Cust.swatch && Cust.fabric) {
				var swatch;
				$(Product.colorSwatches[Cust.fabric]).each(function() {
					if (this.code == Cust.swatch)
						swatch = this;
				});
				if (!swatch) {
					CK.alert(Errors.GENERIC);
					return;
				}
				
				$('[data-code='+Cust.swatch+']').addClass('active');
				$(Product.panels).each(function() {
					Builder.setSvgColor(this.name, swatch.colors[this.name].hex);
				});
			}
		}
		else {
			$(Product.panels).each(function() {
				var group = this.name, hex;
				if (Cust.colors[group])
					hex = $('[data-svg-id="'+group+'"] [data-code="'+Cust.colors[group]+'"]').addClass('active').data('hex');
				else
					hex = null;
				
				Builder.setSvgColor(group, hex);
			});
		}
	},
	initPatterns: function(){
		if (!Builder.patternsDisplayed) {
			$(Product.patternOptions).each(function() {
				var id = this.id;
				var name = this.name;
				var areas = this.areas;
				var pattern = this;

				var html = '<li class="pattern" id="btn-pattern-'+id+'" data-pattern="'+id+'">';
				html += '<img src="/images/cuff-patterns/pattern-'+id+'.png" />';
				html +=	'<div>'+name+'</div>';
				html += '</li>';

				$(".svg g[id^='PATTERN']").attr("class", "hide-pattern");

				$(".option-set.patterns").addClass("active").children("ul").append(html);
				$("#btn-pattern-"+id).bind('click', function(){
					$("li.pattern").removeClass("active");
					$(this).addClass('active');
					Builder.enablePattern(pattern);
				});
			});
			Builder.patternsDisplayed = true;
			$(".option-set.patterns").attr("data-step", 1);
		}

		if (Cust.pattern > 0) {
			$("#btn-pattern-"+Cust.pattern).trigger('click');
			$(Cust.patternColors).each(function(){
				var areaId = this.areaId;
				var panel = "PATTERN_"+Cust.pattern+"_"+areaId;
				$(".group[data-svg-id="+panel+"] li[data-code="+this.color.code+"]").trigger('click');
			})
		}
	},
	enablePattern: function (pattern) {
	    alert('enablePattern');
		var id = pattern.id;
		$('.pattern-colors .c').empty();
		$(pattern.areas).each(function(e){
			var colors = this.colors;
			var areaId = this.areaId;

			var panel = "PATTERN_"+id+"_"+areaId;
			var html = '<div class="group" data-svg-id="'+panel+'">';
			html+=			'<strong>Pattern Area '+(e+1)+' Color</strong>';
			html+=			'<ul>';
			$(colors).each(function(){
				html+=		'<li title="'+this.name+'" data-hex="'+this.hex+'" data-code="'+this.code+'"></li>';
			});
			html+=			'</ul>';
			html+=		'</div>';

			$('.pattern-colors .c').append($(html));
			$(".pattern-colors .c .group ul li").each(function(){
				$(this).css("background-color", "#"+$(this).data("hex"));
				$(this).bind('click', function(e){
					$(this).siblings("li.active").removeClass("active");
					$(this).addClass("active");
					var group = $(this).closest(".group").data("svg-id");
					CK.log(group);
					Builder.setSvgColor(group, $(this).data('hex'));
					//update view model
					Cust.colors[group] = $(this).data('code');
				});
			});
		});
		// if(id == Cust.pattern){
		// 	$(Cust.patternColors).each(function(){
		// 		var areaId = this.areaId;
		// 		var panel = "PATTERN_"+Cust.pattern+"_"+areaId;
		// 		$(".group[data-svg-id="+panel+"] li[data-code="+this.color.code+"]").trigger('click');
		// 	})
		// }
		$(".svg g[id^='PATTERN']").attr("class", "hide-pattern");
		$(".svg g[id^='PATTERN_"+id+"']").attr("class", "show-pattern");
	},
	addImage: function(){
		var svg = $(".canvas-wrapper.active .svg svg g[id^='BODY']");
		var mask_id = "mask"+$(".canvas-wrapper.active").data("view");

		var $image = $('<svg><image xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="https://farm1.staticflickr.com/438/19503927318_a13c9c9513.jpg" width="333" height="500" x="0" y="0" clip-path="url(#'+mask_id+')" ></image></svg>');

		$(".svg-masks").append('<svg height="0" width="0"><defs><clipPath id="'+mask_id+'">'+svg.html()+'</clipPath></defs></svg>');

		svg.append($image);

		Builder.initSVGDrag();
	},
	updatePricing: function(e) {
		CK.log('updatePricing');
		$(".option-set.sizing input").each(function(){
			$(this).removeClass("error");
			var val = $(this).val();
			if (!isInt(val)|| String(val).indexOf("0") == 0 && val != "" && val != "0" && !$(this).hasClass('error')) {
				$(this).addClass('error');
				CK.alert(102);
			}
			else {
				var per_piece = Number($(this).parent().siblings('.per-piece').children("span").text());
				var total_price = per_piece*val;
				var total_container = $(this).parent().siblings('.piece-total');
				total_container.text("$"+total_price.formatMoney(2, '.', ','));
			}
		});
	},
   
	compileReview: function(){
		//fabric
		var container = $(".option-set.review .design");
		$(".category span", container).text(Product.category);
		$(".sku span", container).text(Product.sku);
		$(".fabric span", container).text(Cust.fabric);
	
		//color
		$(".option-set.review .colors ul").empty();
		$(".option-set.color .group").each(function(){
			var zone = $(this).children("strong").text();
			var color = $("li.active", $(this)).attr("title");
			var html = "<li><strong>"+zone+"</strong>: <span>"+color+"</span></li>";
			$(".option-set.review .colors ul").append(html);
		})
		
		//patterns
		// check for patterns and list patterns and colors
	
		//content
		// get text/logo information
	
		//sizing
		$(".option-set.review .quantity .table").empty();
		var total_quant = 0;
		$(".sizing-chart-options > .row").each(function(){
			var size = $(this).children('.col').eq(0).children("strong").text();
			var quant = $('input',$(this)).val();
			total_quant += Number(quant);
			var price_per = $('.per-piece', $(this)).children('span').text();
			var total = $('.piece-total', $(this)).text();

			var html = '<div class="row">';
			html += '<span>'+size.toUpperCase()+'</span>';
			html += '<span>'+quant+'</span>';
			html += '<span>$'+price_per+'</span>';
			html += '<span>'+total+'</span>';
			html += '</div>';

			$(".option-set.review .quantity .table").append(html);
		});
		$(".option-set.review .total-quantity").children('span').text(total_quant);
	},
	acknowledgeSave: function(guid) {
		CK.log('saved, tell the user they dont have to click save');
	},
	acknowledgeSaveQuietly: function(guid) {
		CK.log('saved');
	}
}