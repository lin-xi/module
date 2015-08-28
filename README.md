# module
javascript module.js


javascript module framework


key word:  module, require, use

no configuration

##usage:

1. define a module

### /core/Base.js
```
  module(function(){
	  'use strict';
	  ....
	});
```

2. require a module in another module
### /dust.js
```
  var dust = {
      "core": require('./core/Base')
	};

```

3. require a module in common js file
```
  use('/core/Base.js', function(Base){
    var base = new Base();
    
  });
```

