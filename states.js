module.exports.callSomething = function (){
    return new Promise( ( resolve, reject) =>{
        console.log("something called")
        for (var i = 0; i <= 5; i++) {
            (function (i) {
              setTimeout(function () {
                if(i*20==100) return resolve()
              }, 4000*i);
            })(i);
          };
    })
  }