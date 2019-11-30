function Store(serverUrl) {
    this.stock = {};
    this.cart = {};
    this.onUpdate = null;
    this.serverUrl = serverUrl;

}
Store.prototype.addItemToCart = function(itemName) {
    if (this.stock[itemName].quantity > 0) {
        if (this.cart.hasOwnProperty(itemName)) {
            this.cart[itemName] = this.cart[itemName] + 1;
            this.stock[itemName].quantity = this.stock[itemName].quantity - 1;

        } else {
            this.cart[itemName] = 1;
            this.stock[itemName].quantity = this.stock[itemName].quantity - 1;
        }
    } else {
        alert("Sorry! No item left in the stock!");
    }
    this.onUpdate(itemName);

}

Store.prototype.removeItemFromCart = function(itemName) {
    if (this.cart.hasOwnProperty(itemName)) {
        if (this.cart[itemName] > 1) {
            this.cart[itemName] = this.cart[itemName] - 1;
            this.stock[itemName].quantity = this.stock[itemName].quantity + 1;
        } else {
            delete this.cart[itemName];
        }
    } else {
        alert("No this product in the cart!");
    }
    this.onUpdate(itemName);
}

var ajaxGet = function(url, onSuccess, onError) {
    var count = 0;
    var sendRequest = function() {
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET", url);
        count++;

        xmlhttp.onload = function() {
            if (xmlhttp.status == 200) {
                var response = JSON.parse(xmlhttp.responseText)
                onSuccess(response);
                return;
            } else {
                if (count <= 3) {
                    sendRequest();
                } else {
                    onError(xmlhttp.responseText);
                }
            }
        }

        xmlhttp.timeout = 1000;
        xmlhttp.ontimeout = function() {
            if (count <= 3) {
                sendRequest();
            } else {
                onError(xmlhttp.responseText);
            }
        }

        xmlhttp.onerror = function() {
            if (count <= 3) {
                sendRequest();
            } else {
                onError(xmlhttp.responseText);
            }
        }
        xmlhttp.send();
    }
    sendRequest();
}


Store.prototype.syncWithServer = function(onSync) {
    var currentStore = this;
    ajaxGet(store.serverUrl + "/products",
        function(response) {
            //Compute delta
            var delta = {};
            for (itemName in response) {
                if (store.stock.hasOwnProperty(itemName)) {
                    if (store.cart.hasOwnProperty(itemName)) {
                        delta[itemName] = {};
                        if (store.stock[itemName].price != response[itemName].price) {
                            delta[itemName].price = response[itemName].price - store.stock[itemName].price;
                        }
                        if (store.stock[itemName].quantity != response[itemName].quantity) {
                            delta[itemName].quantity = response[itemName].quantity - (store.stock[itemName].quantity + store.cart[itemName]);
                        }
                    } else {
                        delta[itemName] = {};
                        if (store.stock[itemName].price != response[itemName].price) {
                            delta[itemName].price = response[itemName].price - store.stock[itemName].price;
                        }
                        if (store.stock[itemName].quantity != response[itemName].quantity) {
                            delta[itemName].quantity = response[itemName].quantity - store.stock[itemName].quantity;
                        }
                    }
                } else {
                    delta[itemName] = {};
                    delta[itemName].price = response[itemName].price - 0;
                    delta[itemName].quantity = response[itemName].quantity - 0;
                }
            }

            //Update "response" according to cart
            for (itemName in store.cart) {
                if (store.cart[itemName] <= response[itemName].quantity) {
                    response[itemName].quantity = response[itemName].quantity - store.cart[itemName];
                } else {
                    store.cart[itemName] = response[itemName].quantity;
                    response[itemName].quantity = 0;
                }
            }

            //Update stock
            currentStore.stock = response;
            currentStore.onUpdate();

            if (onSync) {
                onSync(delta);
            }
        },
        function(error) {
            console.log("Error!" + error);
        });
}


Store.prototype.checkOut = function(onFinish) {
    var currentStore = this;
    this.syncWithServer(function(delta) {
        var alertMsg = '';
        for (itemName in delta) {
            if (delta[itemName].price) {
                var oldPrice = currentStore.stock[itemName].price - delta[itemName].price;
                alertMsg += 'Price of ' + itemName + ' changed from $' + oldPrice + ' to $' + currentStore.stock[itemName].price + '\n';
            }
            if (delta[itemName].quantity) {
                var oldQuantity = currentStore.stock[itemName].quantity - delta[itemName].quantity;
                alertMsg += 'Qantity of ' + itemName + ' changed from ' + oldQuantity + ' to ' + currentStore.stock[itemName].quantity + '\n';
            }
        }

        if (alertMsg.length != 0) {
            alert(alertMsg);
        } else {
            var total = 0;
            for (itemName in currentStore.cart) {
                total += currentStore.stock[itemName].price * currentStore.cart[itemName];
            }
            alert('Total Amount Due: $' + total);
        }

        if (onFinish) {
            onFinish();
        }
    });
}

var store = new Store('https://cpen400a-bookstore.herokuapp.com');
store.syncWithServer();


store.onUpdate = function(itemName) {
    if (itemName == null) {
        var productView = document.getElementById('productView');
        renderProductList(productView, this);

    } else {
        var productId = document.getElementById('product-' + itemName);
        renderProduct(productId, store, itemName);


        renderCart(document.getElementById("modal-content"), store);
    }

}

function  showCart(cart)  {    
    var modal = document.getElementById('modal');
    modal.style.display = 'block';
    renderCart(document.getElementById('modal-content'), store);

}

function hideCart(cart) {
    var modal = document.getElementById('modal');
    modal.style.display = 'none';
}

var inactiveTime = 0;

function startTimer() {
    inactiveTime = window.setTimeout(inactiveAlert, 300000);
}

function inactiveAlert() {
    alert("Hey there! Are you still planning to buy something?")
    window.clearTimeout(inactiveTime);
}

function resetTimer() {
    window.clearTimeout(inactiveTime);
    startTimer();
}

function setupTimers() {
    var btnadd = document.getElementsByClassName("btn-add");
    var btnremove = document.getElementsByClassName("btn-remove");
    for (var i = 0; i < btnadd.length; i++) {
        btnadd[i].addEventListener("click", resetTimer, false);
        btnremove[i].addEventListener("click", resetTimer, false);
    }
    document.getElementById("btn-show-cart").addEventListener("click", resetTimer, false);

}


setupTimers();


function renderProduct(container, storeInstance, itemName) {
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    var img = document.createElement('img');
    img.src = storeInstance.stock[itemName].imageUrl;
    img.alt = storeInstance.stock[itemName].label;
    container.appendChild(img);

    var div = document.createElement('div');
    div.className = 'price';
    div.textContent = '$' + storeInstance.stock[itemName].price;
    container.appendChild(div);



    if (storeInstance.stock[itemName].quantity > 0) {
        var addBtn = document.createElement('button');
        addBtn.className = 'btn-add';
        addBtn.setAttribute('onclick', 'store.addItemToCart(\"' + itemName + '\")');
        addBtn.textContent = 'Add';
        container.appendChild(addBtn);
    }
    if (storeInstance.cart[itemName] > 0) {
        var removeBtn = document.createElement('button');
        removeBtn.className = 'btn-remove';
        removeBtn.setAttribute('onclick', 'store.removeItemFromCart(\"' + itemName + '\")');
        removeBtn.textContent = 'Remove';
        container.appendChild(removeBtn);
    }



    var span = document.createElement('span');
    span.textContent = itemName;
    container.appendChild(span);

    return container;

}

function renderProductList(container, storeInstance) {
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    var ul = document.createElement('ul');
    ul.id = 'productList';
    for (itemName in storeInstance.stock) {
        var li = document.createElement('li');
        li.className = 'product';
        li.id = 'product-' + itemName;
        renderProduct(li, storeInstance, itemName);
        ul.appendChild(li);
    }

    container.appendChild(ul);
}



renderProductList(document.getElementById("productView"), store);


function renderCart(container, storeInstance) {
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    var cartTable = document.createElement('table');
    cartTable.id = 'cartTable';
    var firstRow = document.createElement('tr');
    var column1 = document.createElement('td');
    var column2 = document.createElement('td');
    var column3 = document.createElement('td');
    var column4 = document.createElement('td');
    column1.textContent = 'Item';
    column2.textContent = 'Amount';
    column3.textContent = 'Price';
    firstRow.appendChild(column1);
    firstRow.appendChild(column2);
    firstRow.appendChild(column3);
    firstRow.appendChild(column4);
    cartTable.appendChild(firstRow);

    var totalPrice = 0;
    for (itemName in storeInstance.cart) {
        var itemRow = document.createElement('tr');
        var itemNameshow = document.createElement('td');
        itemNameshow.textContent = storeInstance.stock[itemName].label;
        var amount = document.createElement('td');
        amount.textContent = storeInstance.cart[itemName];
        var price = document.createElement('td');
        price.textContent = '$' + storeInstance.cart[itemName] * storeInstance.stock[itemName].price;
        var incBtn = document.createElement('button');
        incBtn.className = 'btn-inc';
        incBtn.setAttribute('onclick', 'store.addItemToCart(\"' + itemName + '\")');
        incBtn.textContent = '+';

        var decBtn = document.createElement('button');
        decBtn.className = 'btn-dec';
        decBtn.setAttribute('onclick', 'store.removeItemFromCart(\"' + itemName + '\")');
        decBtn.textContent = '-';

        itemRow.appendChild(itemNameshow);
        itemRow.appendChild(amount);
        itemRow.appendChild(price);
        itemRow.appendChild(incBtn);
        itemRow.appendChild(decBtn);
        cartTable.appendChild(itemRow);

        totalPrice += storeInstance.cart[itemName] * storeInstance.stock[itemName].price;

    }

    var totalPriceRow = document.createElement('tr');
    var totalPriceshow = document.createElement('td');
    totalPriceshow.textContent = 'Total Price: $' + totalPrice;
    totalPriceshow.setAttribute('colspan', '4');
    totalPriceRow.appendChild(totalPriceshow);
    cartTable.appendChild(totalPriceRow);
    container.appendChild(cartTable);

    var checkoutBtn = document.createElement('button');
    checkoutBtn.id = 'btn-check-out';
    checkoutBtn.textContent = 'Check Out';
    checkoutBtn.onclick = function() {
        checkoutBtn.disabled = true;
        store.checkOut(function() {
            checkoutBtn.disabled = false;
        });
    }
    container.appendChild(checkoutBtn);
}

document.onkeydown = function(event) {
    if (event.keyCode == 27) {
        hideCart();
    }
}