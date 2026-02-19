function setItem(key , value){
    localStorage.setItem(key,  JSON.stringify(value));
}

function getItem(key){
    let value = JSON.parse(localStorage.getItem(key));
    return value;
}

function removeItem(key){
    localStorage.removeItem(key);
}

function clearAllItems(){
    localStorage.clear();
}


export {
   setItem,
   getItem,
   removeItem,
   clearAllItems,
}