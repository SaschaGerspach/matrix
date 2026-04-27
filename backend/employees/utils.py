def get_employee(user):
    try:
        return user.employee
    except user._meta.model.employee.RelatedObjectDoesNotExist:
        return None
