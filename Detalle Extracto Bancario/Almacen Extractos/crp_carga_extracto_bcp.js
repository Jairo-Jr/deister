
function crp_carga_extracto_bcp(pIntFileId) {
    var pIntFileId = 9;

    let mObjBlobData = Ax.db.executeGet(`
    <select>
        <columns>
            file_data
        </columns>
        <from table='textract_file'/>
        <where>
            file_seqno = ?
        </where>
    </select>
`, pIntFileId);

    var wb = Ax.ms.Excel.load(mObjBlobData);
    var mXlsSheet = wb.getSheet(0);
    mXlsSheet.packRows();
// mXlsSheet.removeRow(0);
    var mRsSheet = mXlsSheet.toResultSet();

// console.log(mRsSheet);

    var mStrNumCuenta = '';
    var mStrNumCtaFin = '';
    var mStrCodBan = '';
    var mStrMoneda = '';
    var mStrTipoCuenta = '';
    var mObjDivisa = {
        'Dólares': 'USD',
        'Soles': 'PEN'
    }

    var i = 0;
    mRsSheet.forEach(mRowSheet => {
        if (i == 0){
            mStrNumCuenta = mRowSheet.B.replaceAll('-', '').split(' ')[0];
            var mObjCbankPro = Ax.db.executeQuery(`
            <select>
                <columns>
                    ctafin, codban
                </columns>
                <from table='cbancpro'/>
                <where>
                    bban = ?
                </where>
            </select>
        `, mStrNumCuenta).toOne();
            mStrNumCtaFin = mObjCbankPro.ctafin;
            mStrCodBan = mObjCbankPro.codban;

            console.log(mStrNumCtaFin);
        }
        if (i == 1){
            mStrMoneda = mRowSheet.B;
        }
        if (i == 2){
            mStrTipoCuenta = mRowSheet.B;
        }

        if (i >= 4) {

            var mObjTextract = {
                file_seqno: pIntFileId,
                fecope: mRowSheet.A,
                fecval: mRowSheet.A,
                refer1: mRowSheet.C,
                import: mRowSheet.D,
                refer2: mRowSheet.F,
                docume: mRowSheet.G,
                ctafin: mStrNumCtaFin,
                empcode: '125',
                codban: mStrCodBan,
                ccc1: mStrNumCuenta.substring(0,3),
                ccc2: mStrNumCuenta.substring(3,6),
                ctacte: mStrNumCuenta.substring(6),
                concom: '00',
                conpro: '00001',
                divisa: mObjDivisa[mStrMoneda]
            }
            console.log(mObjTextract);
            Ax.db.insert("textract", mObjTextract);
        }
        i++;
    })

    Ax.db.update("textract_file",
        {
            file_estado : 1
        },
        {
            file_seqno : pIntFileId
        }
    );
}

