const validation_types = {
    NAME: 'name',
    EMAIL: 'email',
    PASSWORD: 'password',
    DIGITS: 'digits'
}

const validate = (type,value) => {
    var nameValidator = /^[a-z]+[^0-9]$/i;
    var emailValidator =  /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/i;
    var passwordValidator = /^((?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.{6,}))/;
    var digitsValidator = /^(?=.*[0-9])/;

    
    switch(type){
        case validation_types.NAME:
            return nameValidator.test(value);
        case validation_types.EMAIL:
            return emailValidator.test(value);
        case validation_types.PASSWORD:
            return passwordValidator.test(value);
        case validation_types.DIGITS:
            return digitsValidator.test(value);
        default:
            throw new TypeError();
    }
}

module.exports = {
    validation_types: validation_types,
    validate: validate
}