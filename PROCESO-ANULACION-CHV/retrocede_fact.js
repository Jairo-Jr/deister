var mFac = Ax.db.executeQuery(`SELECT docser, auxnum2, facidx, auxnum1 
    FROM cvenfach WHERE docser IN ('F281-01876463',
    'F281-01876464',
    'F281-01876465',
    'F281-01876466',
    'F281-01876467',
    'F281-01876468',
    'F281-01876469',
    'F281-01876470',
    'F281-01876471',
    'F281-01876472',
    'F281-01876473',
    'F281-01876474',
    'F281-01876475',
    'F281-01876476',
    'F281-01876477',
    'F281-01876478',
    'F281-01876479',
    'F281-01876480',
    'F281-01876481',
    'F281-01876482',
    'F281-01876483',
    'F281-01876484',
    'F281-01876485',
    'F281-01876486',
    'F281-01876487',
    'F281-01876488',
    'F281-01876489',
    'F281-01876490',
    'F281-01876491',
    'F281-01876492')`).toMemory();
    
    mFac.forEach(fact => {
        // Ax.db.execute(`UPDATE cvenfach SET auxnum2 = 0 WHERE facidx = ${fact.facidx}`);
        // Ax.db.update('cvenfach', {estcab : 'P'}, {facidx : fact.facidx});
        var mFacLin = Ax.db.executeQuery(`SELECT crp_chv_vtas_l.*
                                            FROM crp_chv_vtas_h, crp_chv_vtas_l
                                           WHERE crp_chv_vtas_h.chvid = crp_chv_vtas_l.chvid
                                           AND crp_chv_vtas_h.seqno = ${fact.auxnum1}`).toJSONArray();
        var orden = 2;
        console.log(mFacLin);
        mFacLin.forEach(item => {
            // var nomart = Ax.db.executeQuery(`SELECT FIRST 1 nomart FROM carticul WHERE codart = '${item.codart}'`).toOne();
            Ax.db.insert('cvenfacl', {
                facidx: fact.facidx,
                numero: orden,
                codart: item.codart,
                cantid: item.cantid,
                precio: item.precio,
                totnet: item.cantid * item.precio,
                prolin: item.prolin,
                seclin: 0,
                cuenta: '703210301.00000000'
            });
            orden = orden + 2;
        });
    
        // valida
        Ax.db.call("cvenfachValida", fact.facidx);    
    });
    
    return mFac;