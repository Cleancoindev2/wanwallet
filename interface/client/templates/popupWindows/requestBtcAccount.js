/**
Template Controllers

@module Templates
*/

/**
The request account popup window template

@class [template] popupWindows_requestBtcAccount
@constructor
*/

Template['popupWindows_requestBtcAccount'].onRendered(function () {
    this.$('input.account').focus();
    TemplateVar.set('showPassword', false);
    TemplateVar.set('passwordLow', false);
    TemplateVar.set('passwordRepat', false);
});

Template['popupWindows_requestBtcAccount'].helpers({
    'passwordInputType': function () {
        return TemplateVar.get('showPassword') ? 'text' : 'password';
    }
});

Template['popupWindows_requestBtcAccount'].events({
    'click .cancel': function () {
        ipc.send('backendAction_closePopupWindow');
    },

    'click #close-window': function () {
        TemplateVar.set('creating', false);
        ipc.send('backendAction_closePopupWindow');

    },

    'click .showPassIco': function () {
        TemplateVar.set('showPassword', !TemplateVar.get('showPassword'));
    },

    'input .password-check': function (e, template) {
        var pw = template.find('input.password').value;

        if (pw && pw.length >= 8) {
            var reminder = e.target.value;

            if (reminder === pw) {
                TemplateVar.set('reminderRisk', true);
            }
        }
    },

    'focus .password': function () {
        TemplateVar.set('passwordLow', false);
    },

    'focus .password-repeat': function () {
        TemplateVar.set('passwordRepat', false);
    },

    'submit form': function (e, template) {
        e.preventDefault();

        let pw = template.find('input.password').value;
        let pwRepeat = template.find('input.password-repeat').value;

        if (!(pw) ||(pw && pw.length < 8)) {
            TemplateVar.set('passwordLow', true);
        } else if ( pw !== pwRepeat) {
            TemplateVar.set('passwordRepat', true);
        }  else if (pw && pw.length >= 8) {

            TemplateVar.set(template, 'creating', true);
            TemplateVar.set(template, 'created', false);

            let data = {parameters: pwRepeat, action: 'createBtcAddress'};

            ipc.on('Callback_CrossChain_BTC2WBTC', function (e, data) {
                if (data.action === 'createBtcAddress') {
                    TemplateVar.set(template, 'created', true);
                    if (data.value) {
                        TemplateVar.set(template, 'createdTrue', true);
                    } else {
                        TemplateVar.set(template, 'createdTrue', false);
                    }
                }
            });

            ipc.send('CrossChain_BTC2WBTC', data);

            TemplateVar.set('password-repeat', false);
            template.find('input.password-repeat').value = '';
            template.find('input.password').value = '';
            pw = pwRepeat = null;

        }
   }
});
