function sendaction(buttonid, action) {

    console.log(window.location.hostname)


    fetch('/sendaction', 
    {headers: {'authorization': buttonid,
    actions: JSON.stringify({actionid: action})}})
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      return(response.json());
    })
    .then(blob => {
        console.log(blob)
    })
    .catch((err) => console.error(`Fetch problem: ${err.message}`));

  }


