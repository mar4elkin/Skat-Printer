type OrderExec = {
  documentId: string;
  frameId: number;
  result: Order;
}

type Order = {
  status: string;
  errDescription: string;
  orderNumber: string;
  addressFrom: string;
  addressTo: string;
  price: string;
  car: string;
  options: string;
  paymentMethod: string;
}

document.addEventListener('DOMContentLoaded', () => {
  let button = document.getElementById('btnPrint');
  let bugTracker = document.getElementById('bugtracker')
  let version = document.getElementById('version')

  button.onclick = parserPipeline;
  bugTracker.onclick = () => openRemoteLink('https://github.com/mar4elkin/Skat-Printer/issues/new')
  version.onclick = () => openRemoteLink('https://github.com/mar4elkin/Skat-Printer/releases')
});

function objectToUrl(obj: any) {
  let k = Object.keys(obj);
  let v = Object.values(obj);

  return k.map((el, index) => (
    index == 0 
    ? el = `?${el}=${v[index]}`
    : `&${el}=${v[index]}`
  )).join('');
}

async function getCurrentTab() {
  let queryOptions = { active: true, lastFocusedWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
};

const executeScript = (tabId: number, func: any, args: any) => new Promise(
  resolve => {
    chrome.scripting.executeScript({ target: { tabId }, func, args }, resolve)
});

async function openRemoteLink(url: string) {
  const tab = await getCurrentTab();
  await executeScript(tab.id, window.open(url), []);
};

async function parserPipeline() {
  const tab = await getCurrentTab();

  // @ts-ignore
  const OrderData: Array<OrderExec> = await executeScript(tab.id, parser, []);

  if (OrderData[0].result.status === 'success') {
    setUiStatus('Подготовка к печати', 'green');
    chrome.tabs.create({ url: `order.html${objectToUrl(OrderData[0].result)}`}, (tab) => {
      chrome.runtime.sendMessage({ openOrderPage: true, url: `order.html${objectToUrl(OrderData[0].result)}`, createdTab: tab });
    });
  } else {
    setUiStatus(OrderData[0].result.errDescription, 'red');
  }
};

function setUiStatus(text: string, color: string, isClear=false) {
  if (!isClear) {
    document.getElementById('status').innerHTML = text;
    document.getElementById('status').style.color = color;
  } else {
    document.getElementById('status').innerHTML = ''
  }
}

function parser() {
  let order: Order = {
    status: 'error',
    errDescription: '',
    orderNumber: '',
    addressFrom: '',
    addressTo: '',
    price: '',
    car: '',
    options: '',
    paymentMethod: ''
  }

  //orderNumber
  try {
    let orderNumberElement = document.querySelector("#footer-region > div > div.modal-layer > div > div > div.title > span.title-text.a-v > span.ellipsize")
    
    if (orderNumberElement.innerHTML == "Новый заказ") {
      order.errDescription = "Откройте уже созданный заказ"
      return order
    }

    order.orderNumber = orderNumberElement.innerHTML

  } catch (e) {
    order.errDescription = "Откройте уже созданный заказ"
    return order
  }

  //addressFrom
  try {
    let addressFromElement = document.querySelector("#footer-region > div > div.modal-layer > div > div > div.body > div > div:nth-child(2) > div.col.col-8 > div.order-form > div:nth-child(2) > div > div:nth-child(1) > div > div.field.l1.field-address > div.street.field.field-autocomplete > div > input")
    let addressFromHouseNumberElement = document.querySelector("#footer-region > div > div.modal-layer > div > div > div.body > div > div:nth-child(2) > div.col.col-8 > div.order-form > div:nth-child(2) > div > div:nth-child(1) > div > div.field.l1.field-address > div.house.field.field-autocomplete > div > input")
    
    // @ts-ignore
    if (addressFromElement.value == "") {
      order.errDescription = "Поле отправление не может быть пустым"
      return order
    }

    // @ts-ignore
    if (addressFromHouseNumberElement.value == "") {
      order.errDescription = "Поле отправление не может быть пустым (дом)"
      return order
    }

    // @ts-ignore
    order.addressFrom = `${addressFromElement.value}, ${addressFromHouseNumberElement.value}`
    
  } catch (e) {
    order.errDescription = "Не найдено поле адреса отправления"
    return order
  }

  //addressTo
  try {
    let addressToElement = document.querySelector("#footer-region > div > div.modal-layer > div > div > div.body > div > div:nth-child(2) > div.col.col-8 > div.order-form > div:nth-child(2) > div > div:nth-child(2) > div > div.field.l1.field-address > div.street.field.field-autocomplete > div > input")
    let addressToHouseNumberElement = document.querySelector("#footer-region > div > div.modal-layer > div > div > div.body > div > div:nth-child(2) > div.col.col-8 > div.order-form > div:nth-child(2) > div > div:nth-child(2) > div > div.field.l1.field-address > div.house.field.field-autocomplete > div > input")
  
    // @ts-ignore
    if (addressToElement.value == "") {
      order.errDescription = "Поле отправление не может быть пустым"
      return order
    }

    // @ts-ignore
    if (addressToHouseNumberElement.value == "") {
      order.errDescription = "Поле отправление не может быть пустым (дом)"
      return order
    }

    // @ts-ignore
    order.addressTo = `${addressToElement.value}, ${addressToHouseNumberElement.value}`

  } catch (e) {
    order.errDescription = "Не найдено поле адреса прибытия"
    return order
  }

  //price
  try {
    let priceElement = document.querySelector("#footer-region > div > div.modal-layer > div > div > div.body > div > div:nth-child(2) > div.col.col-4.vertical-flex > div.row.non-flex.no-top-margin.totals > div.col.col-11.total-label.no-padding > span:nth-child(2)")
    
    if (Number.isNaN(parseInt(priceElement.innerHTML))) {
      order.errDescription = "Не найдено поле цены"
      return order
    }
    
    order.price = `${parseInt(priceElement.innerHTML)} рублей`
  } catch (e) {
    order.errDescription = "Не найдено поле цены"
    return order
  }

  //car
  try {
    let carElement = document.querySelector("#footer-region > div > div.modal-layer > div > div > div.body > div > div:nth-child(2) > div.col.col-4.vertical-flex > div:nth-child(1) > div > div > div:nth-child(4) > span.value.dashed")
    
    // @ts-ignore
    let car = carElement.title.match(/[\wа-яА-Я]+/ig)
    order.car = [car[1], car[2], car[3], car[car.length -1]].join(' ')

  } catch (e) {
    order.errDescription = "Не найдено поле с информацией о а/м"
    return order
  }

  //paymentMethod
  try {
    let paymentMethodElement = document.querySelector("#footer-region > div > div.modal-layer > div > div > div.body > div > div:nth-child(2) > div.col.col-8 > div.order-form > div:nth-child(1) > div.col.col-5.no-padding > div > div.col.col-8 > div > div.field-data > input")
    order.paymentMethod = "Наличными водителю"

    // @ts-ignore
    if (paymentMethodElement.value.search("Аэропорт")) {
      order.paymentMethod = "Безналичный расчет"
    }

  } catch (e) {
    order.errDescription = "Не найдено поле с информацией о Контрагенте"
    return order
  }

  //options
  try {
    let tagsElement = document.querySelector("#footer-region > div > div.modal-layer > div > div > div.body > div > div:nth-child(2) > div.col.col-8 > div.order-form > div:nth-child(4) > div")
    let index = 0;
    for (let tag of tagsElement.childNodes) {
      if (index == tagsElement.childElementCount -1) {
        // @ts-ignore
        order.options += `${tag.innerHTML}`
      } else {
        // @ts-ignore
        order.options += `${tag.innerHTML}, `
      }
      index += 1
    }
  } catch (e) {
    
  }
  
  order.status = "success"
  return order
}