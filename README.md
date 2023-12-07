Gitbook Plugin for [Prism](http://prismjs.com/) and support code tabs
==============

[![NPM](http://img.shields.io/npm/v/gitbook-plugin-prism.svg?style=flat-square&label=npm)](https://www.npmjs.com/package/gitbook-plugin-prism)

Integrate [**gitbook-plugin-prism**](https://github.com/gaearon/gitbook-plugin-prism) and [**gitbook-plugin-codetabs**](https://github.com/GitbookIO/plugin-codetabs) into one plugin，it not only highlight code using [**Prism**], but can also using [**Tabs**](https://www.w3schools.com/w3css/w3css_tabulators.asp) to group these code blocks.



**Source code:**

```
{% codetab %}

​```javascript
‌import * as React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

ReactDOM.render(<App />, window.document.getElementById('root'));
​```

​```swift
let s: String = "sample";
​```

​```java
class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!"); 
    }
}
​```

{% endcodetab %}
```

**Display result:**

![Highlight code tabs with prism](preview.png "Highlight code tabs with prism")



## License

Apache 2
