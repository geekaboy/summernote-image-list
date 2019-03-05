(function(factory) {
	/* Global define */
	if (typeof define === "function" && define.amd) {
		// AMD. Register as an anonymous module.
		define(['jquery'], factory);
	} else if (typeof module === "object" && module.exports) {
		// Node/CommonJS
		module.exports = factory(require('jquery'));
	} else {
		// Browser globals
		factory(window.jQuery);
	}
}(function($) {

	$.extend($.summernote.plugins, {
		imageList: function(context) {
			var self = this;
			var ui = $.summernote.ui;
			var editor = context.layoutInfo.editor;

			var options = context.options;

			// Return early if not included in the toolbar
			var isIncludedInToolbar = false;

			for (var idx in options.toolbar) {
				var buttons = options.toolbar[idx][1];

				if ($.inArray("imageList", buttons) > -1) {
					isIncludedInToolbar = true;
					break;
				}
			}

			if (!isIncludedInToolbar) return;

			// Default options
			var defaultImageListOptions = {
				title: "รายการรูปภาพ",
				tooltip: "รายการรูปภาพ",
				buttonHtml: '<i class="fa fa-file-image-o"></i>',
				spinnerHtml: '<span class="fa fa-spinner fa-spin" style="font-size: 50px; line-height: 100px; margin-left: calc(50% - 50px)"></span>',
				endpoint: "",
				fullUrlPrefix: "",
				thumbUrlPrefix: "",
				uploadPath:"",
				delPath:""
			};

			// Provided options
			var imageListOptions = typeof options.imageList === "undefined" ? {} : options.imageList;

			// Assign default values if not provided
			for (var propertyName in defaultImageListOptions) {
				if (imageListOptions.hasOwnProperty(propertyName) === false) {
					imageListOptions[propertyName] = defaultImageListOptions[propertyName];
				}
			}

			// Add the button
			context.memo("button.imageList", function() {
				var button = ui.button({
					contents: imageListOptions.buttonHtml,
					container: false,  //add option
					tooltip: imageListOptions.tooltip,
					click: function(event) {
						self.show();
					}
				});

				// Create jQuery object from button instance.
				return button.render();
			});

			this.createDialog = function(container) {
				var dialogOption = {
					title: imageListOptions.title,
					body: [
						'<div class="custom-file col-sm-6 mb-3">',
						  '<input type="file" class="custom-file-input" id="imgfile" name="imgfile">',
						  '<label class="custom-file-label" for="customFile">Choose image</label>',
						'</div>',
						'<div class="image-list-content"></div>'
					].join(""),
					footer: [
						'<button type="button" class="btn btn-primary image-list-btn-close">Close</button>'
					].join(""),
					closeOnEscape: true
				};

				self.$dialog = ui.dialog(dialogOption).render().appendTo(container);

				self.$dialog.find(".modal-dialog").addClass("modal-lg");
			};

			this.showDialog = function() {
				return $.Deferred(function(deferred) {
					ui.onDialogShown(self.$dialog, function() {
						context.triggerEvent("dialog.shown");

						self.$dialog.modal({backdrop: "static"});
						// Show the spinner
						self.$dialog.find(".image-list-content").html(imageListOptions.spinnerHtml);

						//Get images list
						self.getImgaeList();


						//close modal
						self.$dialog.find(".image-list-btn-close").click(function(event) {
							ui.hideDialog(self.$dialog);
							self.$dialog.remove();
						});



					});//onDialogShown


					ui.onDialogHidden(self.$dialog, function() {
						self.destroy();
						if (deferred.state() === "pending") {
							deferred.reject();
						}
					});

					ui.showDialog(self.$dialog);

					//upload function
					self.$dialog.find("input[name=imgfile]").change(function(event) {
						/* Act on the event */
						self.$dialog.find(".image-list-content").html(imageListOptions.spinnerHtml);
						var url = imageListOptions.uploadPath;
						var fileInput = $(this);
						var file = fileInput[0].files[0];
						var formData = new FormData();
						formData.append('file', file);

						var request = new XMLHttpRequest();
						request.open('POST', url, true);
						request.onload = function() {
							if (request.status >= 200 && request.status < 400) {

								self.getImgaeList();

							} else {
								// We reached our target server, but it returned an error
								var resp = request.responseText;
							}
						};
						request.onerror = function(jqXHR, textStatus, errorThrown) {
							// There was a connection error of some sort
							console.log(jqXHR);
						};
						request.send(formData);

					});

				});


			};

			// Insert selected image into the editor
			this.insertImage = function(filename, fullUrl) {
				fullUrl = fullUrl.replace("https:", "").replace("http:", "");
				context.invoke("editor.insertNode", $('<img src="' + fullUrl + '" data-filename="' + filename + '">')[0]);
			};

			this.show = function() {
				if (!editor.hasClass("fullscreen")) {
					$("html, body").css("overflow", "");
				}

				context.invoke("editor.saveRange");

				self.showDialog()
					.then(function(data) {
						context.invoke("editor.restoreRange");
						self.insertImage(data.filename, data.fullUrl);
						ui.hideDialog(self.$dialog);
					}).fail(function() {
						context.invoke("editor.restoreRange");
				});
			};

			this.getImgaeList = function(){
				$.get(
					imageListOptions.endpoint,
					null,
					null,
					"json"
				).done(function(data) {
					var content = [];
					var fullUrlPrefix = imageListOptions.fullUrlPrefix;
					var thumbUrlPrefix = imageListOptions.thumbUrlPrefix;

					var i = 0;
					$.each(data, function(index, resp) {
						i++;
						content.push([
							'<div class="col-xs-6 col-sm-4 col-md-3 col-lg-3">',
								'<button type="button" class="btn btn-sm btn-warning text-white float-right btn-img-del">',
									'<span class="fa fa-trash-o"></span>',
								'</button>',
								'<div class="image-list-item">',
									'<img class="img-insert" src="' + thumbUrlPrefix + resp.file_name + '"data-filetitle="'+resp.file_title +'" data-filename="' + resp.file_name + '" data-full-url="' + fullUrlPrefix + resp.file_name + '">',
									'<p class="text-truncate"  style="max-width: 160px;">' + resp.file_title + '</p>',
								'</div>',
							'</div>'
						].join(""));

						if ((i + 1) > 0 && (i + 1) % 2 === 0) content.push('<div class="clearfix visible-xs-block"></div>');
						if ((i + 1) > 0 && (i + 1) % 3 === 0) content.push('<div class="clearfix visible-sm-block"></div>');
						if ((i + 1) > 0 && (i + 1) % 4 === 0) content.push('<div class="clearfix visible-md-block visible-lg-block"></div>');
					});


					self.$dialog.find(".image-list-content").html('<div class="row">' + content.join("") + '</div>');

					self.$dialog.find(".img-insert").click(function(event) {
						var filename= $(this).data("filename");
						var fullUrl= $(this).data("full-url");
						self.insertImage(filename, fullUrl);
						ui.hideDialog(self.$dialog);
					});


					$(".btn-img-del").click(function(event) {
						/* Act on the event */
						var img = $(this).next('.image-list-item').children('.img-insert');

						var conf = confirm("Are you sure you want to delete "+img.data("filetitle")+"?" );

						if(conf){
							var param = {filename:img.data("filename")}
							var url = imageListOptions.delPath
							$.post(url, param, function(data, textStatus, xhr) {
								/*optional stuff to do after success */
								if(data.is_success){
									self.getImgaeList();
								}else{
									alert(data.msg);

								}


							},'json').fail(function(){
								alert('Something wrong, Please try again.');
							});
						}

					});

				});//end get function

			}

			this.initialize = function() {
				var container = options.dialogsInBody ? $("body") : editor;
				self.createDialog(container);
			};

			this.destroy = function() {
				ui.hideDialog(self.$dialog);
				self.$dialog.remove();
			};
		}
	});
}));
