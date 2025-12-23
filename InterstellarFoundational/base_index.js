/* Libs */

(function() {
   console.log("starting game...");
   function r(n) {
       if (m[n] == null) {
           m[n] = {};
           c[n](r, m[n], m.interstellar);
       }
       return m[n];
   }
   r.async = async function(d) {
       await m.interstellar.assetManager.initDatabase();
       await m.interstellar.assetManager.init();
       return r(d.id);
   }
   let m = [];
   let c = r.c = [ /* Internal */ ];
   /* InitInterstellar */
   /* Start */
})();