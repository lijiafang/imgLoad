/*
  * JavaScript imgload V1.0
  * https://github.com/tobyreynold/imgLoad.git
  * author : Lynn 
  * Date : 2015
  * Licensed under the MIT license:
  * http://www.opensource.org/licenses/MIT
  */
  /*stack document, URL, webkitURL, Blob, File, FileReader */

;(function ($) {

   'use strict';

    var
        urlAPI = (window && window.createObjectURL) || (window.URL && URL.revokeObjectURL && URL) || (window.webkitURL && webkitURL),

        imgload = function(file,callback,options) {
             var img = document.createElement('img'),
                url,
                oUrl;
            img.onerror = callback;
            img.onload = function () {
                if (oUrl && !(options && options.noRevoke)) {
                    imgload.delUrlObject(oUrl);
                }
                if (callback) {
                    callback(imgload.scale(img, options));
                }
            };
            if (imgload.isInstanceOf('Blob', file) || imgload.isInstanceOf('File', file)) { // 火狐支持会认为是file类型而不是blob类型:
                url = oUrl = imgload.creUrlObject(file);
                img._type = file.type;
            } else if (typeof file === 'string') {
                url = file;
                if (options && options.crossOrigin) {
                    img.crossOrigin = options.crossOrigin;
                }
            } else {
                return false;
            }
            if (url) {
                img.src = url;
                return img;
            }
            return imgload.read(file, function (e) {
                var target = e.target;
                if (target && target.result) {
                    img.src = target.result;
                } else {
                    if (callback) {
                        callback(e);
                    }
                }
            });
    };


    /**
     * image scale
     * @param img option{配置信息}
     * @param img,option 必填
     * @returns img
     */
    imgload.scale = function(img,options) {
        options = options || {};
        var canvas = document.createElement('canvas'),
            useCanvas = img.getContext ||
                (imgload.canvasOptions(options) && canvas.getContext),
            width = img.naturalWidth || img.width,
            height = img.naturalHeight || img.height,
            destWidth = width,
            destHeight = height,
            maxWidth,
            maxHeight,
            minWidth,
            minHeight,
            sourceWidth,
            sourceHeight,
            sourceX,
            sourceY,
            tmp,
            scaleUp = function () {
                var scale = Math.max(
                    (minWidth || destWidth) / destWidth,
                    (minHeight || destHeight) / destHeight
                );
                if (scale > 1) {
                    destWidth = destWidth * scale;
                    destHeight = destHeight * scale;
                }
            },
            scaleDown = function () {
                var scale = Math.min(
                    (maxWidth || destWidth) / destWidth,
                    (maxHeight || destHeight) / destHeight
                );
                if (scale < 1) {
                    destWidth = destWidth * scale;
                    destHeight = destHeight * scale;
                }
            };
        if (useCanvas) {
            options = imgload.extendOptions(img, options);
            sourceX = options.left || 0;
            sourceY = options.top || 0;
            if (options.sourceWidth) {
                sourceWidth = options.sourceWidth;
                if (options.right !== undefined && options.left === undefined) {
                    sourceX = width - sourceWidth - options.right;
                }
            } else {
                sourceWidth = width - sourceX - (options.right || 0);
            }
            if (options.sourceHeight) {
                sourceHeight = options.sourceHeight;
                if (options.bottom !== undefined && options.top === undefined) {
                    sourceY = height - sourceHeight - options.bottom;
                }
            } else {
                sourceHeight = height - sourceY - (options.bottom || 0);
            }
            destWidth = sourceWidth;
            destHeight = sourceHeight;
        }
        maxWidth = options.maxWidth;
        maxHeight = options.maxHeight;
        minWidth = options.minWidth;
        minHeight = options.minHeight;
        if (useCanvas && maxWidth && maxHeight && options.crop) {
            destWidth = maxWidth;
            destHeight = maxHeight;
            tmp = sourceWidth / sourceHeight - maxWidth / maxHeight;
            if (tmp < 0) {
                sourceHeight = maxHeight * sourceWidth / maxWidth;
                if (options.top === undefined && options.bottom === undefined) {
                    sourceY = (height - sourceHeight) / 2;
                }
            } else if (tmp > 0) {
                sourceWidth = maxWidth * sourceHeight / maxHeight;
                if (options.left === undefined && options.right === undefined) {
                    sourceX = (width - sourceWidth) / 2;
                }
            }
        } else {
            if (options.contain || options.cover) {
                minWidth = maxWidth = maxWidth || minWidth;
                minHeight = maxHeight = maxHeight || minHeight;
            }
            if (options.cover) {
                scaleDown();
                scaleUp();
            } else {
                scaleUp();
                scaleDown();
            }
        }
        if (useCanvas) {
            canvas.width = destWidth;
            canvas.height = destHeight;
            imgload.extendOptions(
                canvas,
                options
            );
            return imgload.renderImageToCanvas(
                canvas,
                img,
                sourceX,
                sourceY,
                sourceWidth,
                sourceHeight,
                0,
                0,
                destWidth,
                destHeight
            );
        }
        img.width = destWidth;
        img.height = destHeight;
        return img;
    };

    /**
     * image option extend
     * @param image option{配置信息}
     * @param image,option 必填
     * @returns newOption
     */
    imgload.extendOptions = function(image,options) {
        var newOptions = {},
            item,
            width,
            height,
            ratio = options.ratio;

        if(!ratio) {

            return options;
        }

        for(item in options) {
            if(options.hasOwnProperty(item)) {
                newOptions[item] = options[item];
            }
        }

        newOptions.crop = true;
        width = image.naturalWidth || image.width;
        height = image.naturalHeight || image.height;

        //width,height根据比例依照最小值来决定
        if(width/height < ratio) {
            newOptions.maxWidth = width;
            newOptions.maxHeight = width / ratio;
        } else {
            newOptions.maxWidth = height * ratio;
            newOptions.maxHeight = height;
        }

        return newOptions;
    };


    /**
     * img transfer canvas
     * @param file{上传的文件}  callback{回调} method{FileReader上传的方式,没有时默认为readAsDataURL方式,其他方式:readAsText|readAsBinaryString|readAsArrayBuffer}
     * @param x,y 必填 ,其他选填
     * @returns canvas
     */
    imgload.read = function(file,callback,method){
        if(window.FileReader) {
            var fileReader = new FileReader();

            fileReader.onprogress = function(event) {
                if (event.lengthComputable) {
                    console.log(event.total);
                    console.log(event.loaded);
                }
            };

            fileReader.onload = fileReader.onerror = callback;

            fileReader.onloadend = function(event) {
                //load end do something
                var contents = event.target.result,
                    error = event.target.error;

                if(error != null) {
                    switch (error.code) {
                        case error.ENCODING_ERR:
                            console.error("编码错误");
                            break;

                        case error.NOT_FOUND_ERR:
                            console.error("文件未找到");
                            break;

                        case error.NOT_READABLE_ERR:
                            console.error("文件不能读取");
                            break;

                        case error.SECURITY_ERR:
                            console.error("文件存在安全问题");
                            break;

                        default:
                            console.error("未知错误");
                    }
                } else {
                    console.log(contents);
                }
            };

            method = method || 'readAsDataURL';
            if(fileReader[method]) {
                fileReader[method](file);
            }

            return fileReader;
        }
        return false;
    };


    /**
     * img transfer canvas
     * @param sx{开始剪切的x坐标}  swidth{被剪切图像的宽度} x{在画布上放置图像的x坐标} width{要使用图片的宽度}
     * @param x,y 必填 ,其他选填
     * @returns canvas
     */
    imgload.renderImageToCanvas = function(canvas, img, sx, sy, swidth, sheight, x, y, width, height) {
        canvas.getContext('2d').drawImage(img,sx,sy,swidth,sheight,x,y,width,height);
        return canvas;
    };


    imgload.canvasOptions = function(options) {
        return options.canvas || options.crop || options.aspectRatio;
    };

    /**
     * 判断数据类型
     * @param {o}对象 {t}类型
     * @param o,t 必填
     * @returns ture/false
     */
    imgload.isInstanceOf = function(t,o) {
        console.log(Object.prototype.toString.call(o) === '[object '+ t + ']');
        return Object.prototype.toString.call(o) === '[object '+ t + ']';

    };

    /**
     * 创建URL对象
     * @param {file}
     * @param file 必填
     * @returns 通过返回的图片二进制数据来创建一个对象URL.
     */


    imgload.creUrlObject = function(file) {
        return urlAPI ? urlAPI.createObjectURL(file) : false;
    };


    /**
     * 释放URL对象
     * @param {file}
     * @param file 必填
     * @returns 当图片加载完成后释放对象URL.
     */
    imgload.delUrlObject = function(url) {
        return urlAPI ? urlAPI.revokeObjectURL(url) : false;
    };


    if (typeof define === 'function' && define.amd) {
        define(function () {
            return imgload;
        });
    } else {
        $.imgload = imgload;
    }

    imgload.transformCoordinates = function () {
        return;
    };


    var hasblobSlice = window.Blob && (Blob.prototype.slice ||
            Blob.prototype.webkitSlice || Blob.prototype.mozSlice);

    imgload.blobSlice = hasblobSlice && function () {
        var slice = this.slice || this.webkitSlice || this.mozSlice;
        return slice.apply(this, arguments);
    };

    imgload.metaDataParsers = {
        jpeg: {
            0xffe1: [] // APP1 marker
        }
    };

    imgload.parseMetaData = function (file, callback, options) {
        options = options || {};
        var that = this,
            maxMetaDataSize = options.maxMetaDataSize || 262144,
            data = {},
            noMetaData = !(window.DataView  && file && file.size >= 12 &&
                file.type === 'image/jpeg' && imgload.blobSlice);
        if (noMetaData || !imgload.read(
                imgload.blobSlice.call(file, 0, maxMetaDataSize),
                function (e) {
                    if (e.target.error) {
                        console.log(e.target.error);
                        callback(data);
                        return;
                    }
                   
                    var buffer = e.target.result,
                        dataView = new DataView(buffer),
                        offset = 2,
                        maxOffset = dataView.byteLength - 4,
                        headLength = offset,
                        markerBytes,
                        markerLength,
                        parsers,
                        i;
            
                    if (dataView.getUint16(0) === 0xffd8) {
                        while (offset < maxOffset) {
                            markerBytes = dataView.getUint16(offset);
                            if ((markerBytes >= 0xffe0 && markerBytes <= 0xffef) ||
                                    markerBytes === 0xfffe) {
                            
                                markerLength = dataView.getUint16(offset + 2) + 2;
                                if (offset + markerLength > dataView.byteLength) {
                                    console.log('Invalid meta data: Invalid segment size.');
                                    break;
                                }
                                parsers = imgload.metaDataParsers.jpeg[markerBytes];
                                if (parsers) {
                                    for (i = 0; i < parsers.length; i += 1) {
                                        parsers[i].call(
                                            that,
                                            dataView,
                                            offset,
                                            markerLength,
                                            data,
                                            options
                                        );
                                    }
                                }
                                offset += markerLength;
                                headLength = offset;
                            } else {
                                break;
                            }
                        }
                        
                        if (!options.disableImageHead && headLength > 6) {
                            if (buffer.slice) {
                                data.imageHead = buffer.slice(0, headLength);
                            } else {
                            
                                data.imageHead = new Uint8Array(buffer)
                                    .subarray(0, headLength);
                            }
                        }
                    } else {
                        console.log('Invalid JPEG file: Missing JPEG marker.');
                    }
                    callback(data);
                },
                'readAsArrayBuffer'
            )) {
            callback(data);
        }
    };

}(this));