import { TestBed } from '@angular/core/testing';

import { AlocacoesService } from './alocacoes.service';

describe('AlocacoesService', () => {
  let service: AlocacoesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AlocacoesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
