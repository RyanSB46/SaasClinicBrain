# Exemplos de Request/Response - Auth

## POST /api/auth/register

### Request

```json
{
  "name": "Dra. Fernanda Souza",
  "email": "fernanda.souza@clinicbrain.local",
  "password": "sua_senha_segura_aqui",
  "phoneNumber": "5527999990001"
}
```

### Response 201

```json
{
  "accessToken": "<jwt>",
  "professional": {
    "id": "cmlxxxx",
    "name": "Dra. Fernanda Souza",
    "email": "fernanda.souza@clinicbrain.local"
  }
}
```

## POST /api/auth/login

### Request

```json
{
  "email": "fernanda.souza@clinicbrain.local",
  "password": "sua_senha_segura_aqui"
}
```

### Response 200

```json
{
  "accessToken": "<jwt>",
  "professional": {
    "id": "cmlxxxx",
    "name": "Dra. Fernanda Souza",
    "email": "fernanda.souza@clinicbrain.local"
  }
}
```

## GET /api/auth/me

### Header

```txt
Authorization: Bearer <jwt>
```

### Response 200

```json
{
  "professional": {
    "id": "cmlxxxx",
    "name": "Dra. Fernanda Souza",
    "email": "fernanda.souza@clinicbrain.local"
  }
}
```
