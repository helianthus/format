/*!
 * Python 3 Like String Formatting
 * Copyright (c) 2010 project.helianthus <http://github.com/helianthus>
 * Licensed under the MIT License. <http://www.opensource.org/licenses/mit-license.php>
 *
 * version: 1.0.0
 */

(function()
{

function FormatError(message, extra)
{
	this.name = 'FormatError';
	this.message = message;

	for(var name in extra) {
		this[name] = extra[name];
	}

	console.error(this);
}

FormatError.prototype = new Error();
FormatError.prototype.constructor = FormatError;

var radixes = { b:2, o:8, d: 10, x:16, X:16 };

var converters = {
	's': function(target)
	{
		return target + '';
	},
	'-': function(target)
	{
		return -target;
	}
};

for(var type in radixes) {
	converters[type] = (function(radix)
	{
		return function(target)
		{
			return parseInt(target, radix);
		};
	})(radixes[type]);
}

function isNumber(target)
{
	return /^(?:string|number)$/.test(typeof target) && !isNaN(+target);
}

var formatters = function(target, format)
{
	format.replace(/^(?:\*(\d+))?(?:(.)?([<>=^]))?([ +-])?(#)?(0)?(\d+)?(,)?(?:\.(\d+))?([bcdeEfgGFosxX%])?$/, function($0, repeat, fill, align, sign, _sharp, _0, width, _comma, precision, type)
	{
		var addSignAtLast = 0;

		var undefined;

		if(!type) {
			type = isNumber(target) ? 'g' : 's';
		}

		if(!align) {
			align = type === 's' ? '<' : '>';
		}

		if(_0) {
			fill = '0';
			align = '=';
		}

		if(type !== 's') {
			if(sign) {
				if(sign === '-') {
					sign = null;
				}
				else if(target < 0) {
					if(sign === ' ') {
						sign = '-';
					}
					else if(sign === '+') {
						target = -target;
					}
				}
			}

			if(/[bcdoxX]/.test(type)) {
				target = (+target).toFixed(0);

				if(type in radixes) {
					target = (+target).toString(radixes[type]);
				}
				else if(type === 'c') {
					target = String.fromCharCode(target);
				}
			}
			else {
				if(/e/i.test(type)) {
					target = isNumber(precision) ? target.toExponential() : target.toExponential(precision);
				}
				else {
					if(type === '%') {
						target = target * 100;
					}

					target = isNumber(precision) ? target.toFixed(precision) : target + '';

					if(type === '%') {
						target += '%';
					}
				}
			}

			if(/[A-Z]/.test(type)) {
				target = target.toUpperCase();
			}

			if(_comma) {
				target = target.split('.');
				target = target[0].replace(/\d{3}(?!$)/g, '$&,') + target[1];
			}

			if(sign) {
				if(align === '=') {
					align = '>';
					addSignAtLast = 1;
				}
				else {
					target = sign + target;
				}
			}
		}

		if(repeat) {
			var temp = target;
			for(var i=1; i<repeat; ++i) {
				target += temp;
			}
		}

		if(width) {
			var padding = (type === 's' && precision ? Math.min(width, precision) : width) - target.length - addSignAtLast;
			fill = fill || ' ';

			while(padding-- > 0) {
				if(align === '<' || align === '^' && padding % 2) {
					target += fill;
				}
				else {
					target = fill + target;
				}
			}
		}

		if(addSignAtLast) {
			target = sign + target;
		}
	});

	return target;
};

var format = function(target)
{
	if(arguments.length === 1) {
		return typeof target === 'string' ? target : format.apply(this, target);
	}

	var args = [].slice.call(arguments, 1);

	return target.replace(/{(\d+)((?:[^{}]|{\d[^{}]*})*)}/g, function(field, index, modifiers)
	{
		if(!(index in args)) {
			throw new FormatError('Invalid index.', {
				source: target,
				args: args,
				match: field,
				index: index
			});
		}

		var count = 0;
		do {
			var temp = modifiers;
			modifiers = format([modifiers].concat(args));

			if(++count === 10) {
				throw new FormatError('Too many recursions.', {
					source: target,
					args: args,
					match: temp,
					replacement: modifiers
				});
			}
		}
		while(modifiers !== temp);

		return modifiers.replace(/((?:[[.][^[.|!:]+)*)(\|[^:!]*)?(?:!([^:]+))?(?::(.+))?/, function($0, props, alt, convert, fmt)
		{
			var replacement = /{\d/.test(args[index]) ? format([args[index]].concat(args)) : args[index];

			if(props) {
				props = props.replace(/(?:^[.[]|[\]\) ])/g, '').split(/[.[]/);

				for(var i=0; i<props.length; i++) {
					if(replacement == null) {
						break;
					}

					var prop = props[i].split('(');

					if(prop.length === 2) {
						if(typeof replacement[prop[0]] !== 'function') {
							replacement = null;
							break;
						}

						replacement = replacement[prop[0]].apply(replacement, prop[1].split(','));
					}
					else {
						replacement = replacement[prop[0]];
					}
				}
			}

			if(alt && !replacement) {
				replacement = alt.slice(1);
			}

			if(convert) {
				for(var i=0; i<convert.length; i++) {
					var converter = convert.charAt(i);

					if(converters[converter]) {
						replacement = converters[converter](replacement);
					}
				}
			}

			if(fmt) {
				replacement = formatters(replacement, fmt);
			}

			if(!/^(?:number|string)$/.test(typeof replacement)) {
				throw new FormatError('Replacement is not a string or number.', {
					source: target,
					args: args,
					match: field,
					replacement: replacement
				});
			}

			return replacement;
		});
	});
};

if(typeof module !== 'undefined' && module.exports) {
	module.exports = format;
}
else if(typeof define === 'function' && define.amd) {
	define(function(){ return format; });
}
else {
	this.format = format;
}

})();
